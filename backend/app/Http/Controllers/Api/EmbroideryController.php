<?php

namespace App\Http\Controllers\Api;

use App\Models\CompletionLog;
use App\Models\Embroidery;
use App\Services\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmbroideryController extends BaseController
{
    public function __construct(
        protected OpenAIService $openAI
    ) {}

    /**
     * Display a listing of embroideries (read-only display for milestone).
     */
    public function index()
    {
        $embroideries = Embroidery::with(['materials', 'completionLog', 'patterns'])->orderBy('name', 'asc')->get();

        foreach ($embroideries as $embroidery) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }

        return $this->sendResponse($embroideries, 'Embroideries');
    }

    /**
     * Store a new embroidery with cover image uploaded to images/ on S3.
     */
    public function store(Request $request)
    {
        $validator = Validator::make(
            $request->all(),
            $this->embroideryValidationRules($request, true),
            $this->embroideryValidationMessages()
        );

        if ($validator->fails()) {
            return $this->sendError('Please correct the fields below.', $validator->errors(), 422);
        }

        $embroidery = new Embroidery;

        if ($request->hasFile('file')) {
            try {
                $extension = $request->file('file')->getClientOriginalExtension();
                $image_name = time().'_embroidery_cover.'.$extension;
                $path = $request->file('file')->storeAs(
                    'images',
                    $image_name,
                    's3'
                );
                if (! $path) {
                    Log::error('Embroidery create upload failed: storeAs returned empty path');

                    return $this->sendError(
                        'Cover image could not be saved to storage. Try a smaller file or a different format.',
                        [],
                        500
                    );
                }
                try {
                    Storage::disk('s3')->setVisibility($path, 'public');
                } catch (\Throwable $e) {
                    Log::warning('S3 setVisibility failed (non-fatal): '.$e->getMessage());
                }
                $embroidery->embroidery_picture = $path;
            } catch (\Throwable $e) {
                Log::error('Embroidery create upload failed: '.$e->getMessage(), ['exception' => $e]);

                return $this->sendError(
                    'Cover image could not be saved to storage. Try a smaller file or a different format.',
                    [],
                    500
                );
            }
        }

        $embroidery->name = $request['name'];
        $embroidery->description = $request['description'];
        $embroidery->save();

        $embroidery->materials()->sync($this->normalizedMaterialIds($request));
        $this->syncSinglePattern($embroidery, $request);
        $this->syncCompletionLog($embroidery, $request);
        $embroidery->load(['materials', 'completionLog', 'patterns']);

        if (isset($embroidery->embroidery_picture)) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }
        $success['embroidery'] = $embroidery;

        return $this->sendResponse($success, 'Embroidery created.');
    }

    /**
     * Generate a project template image from a title and description (DALL·E 3), stored on S3.
     */
    public function generateTemplate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
        ], [
            'title.required' => 'Enter a project title for the AI template.',
            'title.max' => 'Title must be 255 characters or fewer.',
            'description.required' => 'Enter a description so the AI can suggest a design.',
            'description.max' => 'Description must be 5,000 characters or fewer.',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Please correct the fields below.', $validator->errors(), 422);
        }

        if (! $this->openAI->isConfigured()) {
            Log::warning('EmbroideryController::generateTemplate: OPENAI_API_KEY not set');

            return $this->sendError(
                'OpenAI API key is not configured. Add OPENAI_API_KEY to your .env file.',
                [],
                503
            );
        }

        $title = (string) $request->input('title');
        $description = (string) $request->input('description');

        Log::info('EmbroideryController::generateTemplate: request received', [
            'title_length' => mb_strlen($title),
            'description_length' => mb_strlen($description),
        ]);

        try {
            $result = $this->openAI->generateEmbroideryTemplateImage($title, $description);
            $url = $this->getS3Url($result['path']);

            Log::info('EmbroideryController::generateTemplate: success', [
                'storage_path' => $result['path'],
                'resolved_image_url_is_null' => $url === null,
            ]);

            return $this->sendResponse([
                'image_url' => $url,
                'preview_base64' => $result['preview_base64'],
            ], 'Template image generated.');
        } catch (\Throwable $e) {
            Log::error('EmbroideryController::generateTemplate: exception', [
                'message' => $e->getMessage(),
                'exception_class' => $e::class,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            // 503 = upstream (OpenAI) or generation failed — not a proxy/gateway fault
            return $this->sendError(
                'Could not generate the template image. Check your OpenAI API key, billing, and rate limits, then try again.',
                [],
                503
            );
        }
    }

    /**
     * Update name, description, and optionally replace the cover image on S3.
     */
    public function update(Request $request, Embroidery $embroidery)
    {
        $validator = Validator::make(
            $request->all(),
            $this->embroideryValidationRules($request, false),
            $this->embroideryValidationMessages()
        );

        if ($validator->fails()) {
            return $this->sendError('Please correct the fields below.', $validator->errors(), 422);
        }

        $oldPicturePath = $embroidery->embroidery_picture;

        if ($request->hasFile('file')) {
            try {
                $extension = $request->file('file')->getClientOriginalExtension();
                $image_name = time().'_embroidery_cover.'.$extension;
                $path = $request->file('file')->storeAs(
                    'images',
                    $image_name,
                    's3'
                );
                if (! $path) {
                    Log::error('Embroidery update upload failed: storeAs returned empty path');

                    return $this->sendError(
                        'Cover image could not be saved to storage. Try a smaller file or a different format.',
                        [],
                        500
                    );
                }
                try {
                    Storage::disk('s3')->setVisibility($path, 'public');
                } catch (\Throwable $e) {
                    Log::warning('S3 setVisibility failed (non-fatal): '.$e->getMessage());
                }
                if ($oldPicturePath) {
                    Storage::disk('s3')->delete($oldPicturePath);
                }
                $embroidery->embroidery_picture = $path;
            } catch (\Throwable $e) {
                Log::error('Embroidery update upload failed: '.$e->getMessage(), ['exception' => $e]);

                return $this->sendError(
                    'Cover image could not be saved to storage. Try a smaller file or a different format.',
                    [],
                    500
                );
            }
        }

        $embroidery->name = $request['name'];
        $embroidery->description = $request['description'];
        $embroidery->save();

        $embroidery->materials()->sync($this->normalizedMaterialIds($request));
        $this->syncSinglePattern($embroidery, $request);
        $this->syncCompletionLog($embroidery, $request);
        $embroidery->load(['materials', 'completionLog', 'patterns']);

        if (isset($embroidery->embroidery_picture)) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }
        $success['embroidery'] = $embroidery;

        return $this->sendResponse($success, 'Embroidery updated.');
    }

    /**
     * Permanently delete the embroidery and its cover image from S3.
     */
    public function destroy(Embroidery $embroidery)
    {
        $id = $embroidery->id;

        if ($embroidery->embroidery_picture) {
            Storage::disk('s3')->delete($embroidery->embroidery_picture);
        }

        $embroidery->forceDelete();

        $success = ['id' => $id];

        return $this->sendResponse($success, 'Embroidery deleted.');
    }

    /**
     * Replace the stored image path and upload the new file to the images folder (S3 or local disk).
     */
    public function updateEmbroideryPicture(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|image|mimes:jpeg,png,jpg,gif,svg',
        ], $this->embroideryPictureFileMessages());

        if ($validator->fails()) {
            return $this->sendError('Please correct the fields below.', $validator->errors(), 422);
        }

        $embroidery = Embroidery::findOrFail($id);
        $oldPicturePath = $embroidery->embroidery_picture;

        if ($request->hasFile('file')) {
            try {
                $extension = $request->file('file')->getClientOriginalExtension();
                $image_name = time() . '_embroidery.' . $extension;
                $path = $request->file('file')->storeAs(
                    'images',
                    $image_name,
                    's3'
                );
                if (! $path) {
                    Log::error('Embroidery picture upload failed: storeAs returned empty path');

                    return $this->sendError(
                        'Cover image could not be saved to storage. Try a smaller file or a different format.',
                        [],
                        500
                    );
                }
                try {
                    Storage::disk('s3')->setVisibility($path, 'public');
                } catch (\Throwable $e) {
                    Log::warning('S3 setVisibility failed (non-fatal): '.$e->getMessage());
                }
                if ($oldPicturePath) {
                    Storage::disk('s3')->delete($oldPicturePath);
                }
                $embroidery->embroidery_picture = $path;
            } catch (\Throwable $e) {
                Log::error('Embroidery picture upload failed: '.$e->getMessage(), ['exception' => $e]);

                return $this->sendError(
                    'Cover image could not be saved to storage. Try a smaller file or a different format.',
                    [],
                    500
                );
            }
        }

        $embroidery->save();

        $embroidery->load(['materials', 'completionLog', 'patterns']);

        if (isset($embroidery->embroidery_picture)) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }
        $success['embroidery'] = $embroidery;

        return $this->sendResponse($success, 'Embroidery picture successfully updated!');
    }

    /**
     * @return array<string, string>
     */
    private function embroideryValidationMessages(): array
    {
        return [
            'name.required' => 'Please enter a project name.',
            'name.max' => 'Project name must be 255 characters or fewer.',
            'description.required' => 'Please enter a description for this project.',
            'file.required' => 'Upload a cover image (JPEG, PNG, GIF, or SVG).',
            'file.image' => 'The cover must be an image file.',
            'file.mimes' => 'Cover must be JPEG, PNG, GIF, or SVG.',
            'material_ids.array' => 'Materials must be a valid list.',
            'material_ids.*.integer' => 'Each material must be a valid choice.',
            'material_ids.*.exists' => 'One or more selected materials are not in the catalog.',
            'pattern_id.integer' => 'Pattern must be a valid selection.',
            'pattern_id.exists' => 'The selected pattern is not in the catalog.',
            'completion_enabled.boolean' => 'Completion log must be on or off.',
            'completion_completed_at.required' => 'Choose the date you finished this project.',
            'completion_completed_at.date' => 'Enter a valid completion date.',
            'completion_satisfaction_rating.required' => 'Enter a satisfaction rating from 1 to 10.',
            'completion_satisfaction_rating.integer' => 'Satisfaction must be a whole number.',
            'completion_satisfaction_rating.min' => 'Satisfaction must be at least 1.',
            'completion_satisfaction_rating.max' => 'Satisfaction must be at most 10.',
            'completion_hours_spent.numeric' => 'Hours must be a number.',
            'completion_hours_spent.min' => 'Hours cannot be negative.',
            'completion_hours_spent.max' => 'Hours value is too large.',
            'completion_notes.max' => 'Notes must be 5,000 characters or fewer.',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function embroideryPictureFileMessages(): array
    {
        return [
            'file.required' => 'Choose an image file to upload.',
            'file.image' => 'The file must be an image.',
            'file.mimes' => 'Use JPEG, PNG, GIF, or SVG.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function embroideryValidationRules(Request $request, bool $isCreate): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'file' => $isCreate ? 'required|image|mimes:jpeg,png,jpg,gif,svg' : 'nullable|image|mimes:jpeg,png,jpg,gif,svg',
            'material_ids' => 'nullable|array',
            'material_ids.*' => 'integer|exists:materials,id',
            'pattern_id' => 'nullable|integer|exists:patterns,id',
            'completion_enabled' => 'nullable|boolean',
        ];

        if ($request->boolean('completion_enabled')) {
            $rules['completion_completed_at'] = 'required|date';
            $rules['completion_satisfaction_rating'] = 'required|integer|min:1|max:10';
            $rules['completion_hours_spent'] = 'nullable|numeric|min:0|max:999999.99';
            $rules['completion_notes'] = 'nullable|string|max:5000';
        }

        return $rules;
    }

    /**
     * Single-select pattern: sync 0 or 1 row on embroidery_pattern (many-to-many).
     */
    private function syncSinglePattern(Embroidery $embroidery, Request $request): void
    {
        $raw = $request->input('pattern_id');
        if ($raw === null || $raw === '') {
            $embroidery->patterns()->sync([]);

            return;
        }
        $id = (int) $raw;
        if ($id > 0) {
            $embroidery->patterns()->sync([$id]);
        } else {
            $embroidery->patterns()->sync([]);
        }
    }

    private function syncCompletionLog(Embroidery $embroidery, Request $request): void
    {
        if (! $request->boolean('completion_enabled')) {
            $embroidery->completionLog()?->delete();

            return;
        }

        $hours = $request->input('completion_hours_spent');
        CompletionLog::updateOrCreate(
            ['embroidery_id' => $embroidery->id],
            [
                'completed_at' => $request->input('completion_completed_at'),
                'hours_spent' => $hours === null || $hours === '' ? null : $hours,
                'satisfaction_rating' => (int) $request->input('completion_satisfaction_rating'),
                'notes' => $request->input('completion_notes') ?: null,
            ]
        );
    }

    /**
     * @return array<int, int>
     */
    private function normalizedMaterialIds(Request $request): array
    {
        $raw = $request->input('material_ids', []);
        if (! is_array($raw)) {
            return [];
        }

        $ids = [];
        foreach ($raw as $v) {
            $id = (int) $v;
            if ($id > 0) {
                $ids[] = $id;
            }
        }

        return array_values(array_unique($ids));
    }
}

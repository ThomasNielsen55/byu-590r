<?php

namespace App\Http\Controllers\Api;

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
        $embroideries = Embroidery::with('materials')->orderBy('name', 'asc')->get();

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
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'file' => 'required|image|mimes:jpeg,png,jpg,gif,svg',
            'material_ids' => 'nullable|array',
            'material_ids.*' => 'integer|exists:materials,id',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors());
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

                    return $this->sendError('Embroidery picture failed to upload!', [], 500);
                }
                try {
                    Storage::disk('s3')->setVisibility($path, 'public');
                } catch (\Throwable $e) {
                    Log::warning('S3 setVisibility failed (non-fatal): '.$e->getMessage());
                }
                $embroidery->embroidery_picture = $path;
            } catch (\Throwable $e) {
                Log::error('Embroidery create upload failed: '.$e->getMessage(), ['exception' => $e]);

                return $this->sendError('Embroidery picture failed to upload!', [], 500);
            }
        }

        $embroidery->name = $request['name'];
        $embroidery->description = $request['description'];
        $embroidery->save();

        $embroidery->materials()->sync($this->normalizedMaterialIds($request));
        $embroidery->load('materials');

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
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors(), 422);
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
                $e->getMessage() ?: 'Image generation failed.',
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
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg',
            'material_ids' => 'nullable|array',
            'material_ids.*' => 'integer|exists:materials,id',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors());
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

                    return $this->sendError('Embroidery picture failed to upload!', [], 500);
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

                return $this->sendError('Embroidery picture failed to upload!', [], 500);
            }
        }

        $embroidery->name = $request['name'];
        $embroidery->description = $request['description'];
        $embroidery->save();

        $embroidery->materials()->sync($this->normalizedMaterialIds($request));
        $embroidery->load('materials');

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
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error.', $validator->errors());
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

                    return $this->sendError('Embroidery picture failed to upload!', [], 500);
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

                return $this->sendError('Embroidery picture failed to upload!', [], 500);
            }
        }

        $embroidery->save();

        $embroidery->load('materials');

        if (isset($embroidery->embroidery_picture)) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }
        $success['embroidery'] = $embroidery;

        return $this->sendResponse($success, 'Embroidery picture successfully updated!');
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

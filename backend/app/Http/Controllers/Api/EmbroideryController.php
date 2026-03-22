<?php

namespace App\Http\Controllers\Api;

use App\Models\Embroidery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmbroideryController extends BaseController
{
    /**
     * Display a listing of embroideries (read-only display for milestone).
     */
    public function index()
    {
        $embroideries = Embroidery::orderBy('name', 'asc')->get();

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

        if (isset($embroidery->embroidery_picture)) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }
        $success['embroidery'] = $embroidery;

        return $this->sendResponse($success, 'Embroidery created.');
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
                $embroidery->embroidery_picture = $path;
            } catch (\Throwable $e) {
                Log::error('Embroidery picture upload failed: '.$e->getMessage(), ['exception' => $e]);

                return $this->sendError('Embroidery picture failed to upload!', [], 500);
            }
        }

        $embroidery->save();

        if (isset($embroidery->embroidery_picture)) {
            $embroidery->embroidery_picture = $this->getS3Url($embroidery->embroidery_picture);
        }
        $success['embroidery'] = $embroidery;

        return $this->sendResponse($success, 'Embroidery picture successfully updated!');
    }
}

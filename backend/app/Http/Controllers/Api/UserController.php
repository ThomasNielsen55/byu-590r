<?php

namespace App\Http\Controllers\Api;

use App\Mail\VerifyEmail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class UserController extends BaseController
{
    public function getUser()
    {
        $authUser = Auth::user();
        $user = User::findOrFail($authUser->id);
        $user->avatar = $this->getS3Url($user->avatar);
        return $this->sendResponse($user, 'User');
    }

    public function uploadAvatar(Request $request)
    {
        // If no file arrived (e.g. exceeded PHP upload_max_filesize), return a clear error
        if (! $request->hasFile('image')) {
            return $this->sendError(
                'No image received. Ensure the file is an image (jpeg, png, gif, webp, svg) and under 10MB.',
                [],
                422
            );
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp,svg|max:10240', // 10MB
        ], [
            'image.required' => 'Please select an image file.',
            'image.image' => 'The file must be an image.',
            'image.mimes' => 'Allowed formats: jpeg, png, jpg, gif, webp, svg.',
            'image.max' => 'The image must not be larger than 10MB.',
        ]);

        $authUser = Auth::user();
        $user = User::findOrFail($authUser->id);
        $extension = $request->file('image')->getClientOriginalExtension();
        $image_name = time() . '_' . $authUser->id . '.' . $extension;
        $path = $request->file('image')->storeAs(
            'images',
            $image_name,
            's3'
        );
        if (! $path) {
            return $this->sendError('User profile avatar failed to upload.', [], 500);
        }

        Storage::disk('s3')->setVisibility($path, 'public');

        $user->avatar = $path;
        $user->save();

        $success['avatar'] = $this->getS3Url($path);
        return $this->sendResponse($success, 'User profile avatar uploaded successfully!');
    }

    public function removeAvatar()
    {
        $authUser = Auth::user();
        $user = User::findOrFail($authUser->id);
        if ($user->avatar) {
            Storage::disk('s3')->delete($user->avatar);
        }
        $user->avatar = null;
        $user->save();
        $success['avatar'] = null;
        return $this->sendResponse($success, 'User profile avatar removed successfully!');
    }

    public function sendVerificationEmail(Request $request)
    {
        $authUser = Auth::user();
        $user = User::findOrFail($authUser->id);
        Mail::to($user->email)->send(new VerifyEmail($user->email));
        $success['status'] = true;
        return $this->sendResponse($success, 'Email sent to ' . $user->email);
    }

    public function changeEmail(Request $request)
    {
        $request->validate([
            'change_email' => 'required|email|unique:users,email|min:3',
        ]);
        $authUser = Auth::user();
        $user = User::findOrFail($authUser->id);
        $user->email = $request->change_email;
        $user->save();
        Mail::to($user->email)->send(new VerifyEmail($user->email));
        $success['email'] = $user->email;
        return $this->sendResponse($success, 'Email sent to ' . $user->email);
    }
}


<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OpenAIService
{
    protected ?string $apiKey;

    protected string $baseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        $this->apiKey = env('OPENAI_API_KEY') ?: null;
    }

    /**
     * Placeholder method for OpenAI integration
     * Replace this with your actual OpenAI service implementation
     */
    public function placeholder(): array
    {
        return [
            'message' => 'OpenAI service placeholder - implement your OpenAI integration here',
            'status' => 'placeholder',
            'api_key_configured' => ! empty($this->apiKey),
        ];
    }

    /**
     * Check if OpenAI service is properly configured
     */
    public function isConfigured(): bool
    {
        return ! empty($this->apiKey);
    }

    /**
     * Get service status
     */
    public function getStatus(): array
    {
        return [
            'service' => 'OpenAI',
            'configured' => $this->isConfigured(),
            'base_url' => $this->baseUrl,
            'has_api_key' => ! empty($this->apiKey),
        ];
    }

    /**
     * Generate an embroidery project template image via DALL·E 3, store on S3, return path + base64 for the client.
     *
     * @return array{path: string, preview_base64: string}
     *
     * @throws \RuntimeException
     */
    public function generateEmbroideryTemplateImage(string $title, string $description): array
    {
        if (! $this->isConfigured()) {
            Log::warning('OpenAIService: generateEmbroideryTemplateImage called but OPENAI_API_KEY is empty');

            throw new \RuntimeException('OpenAI API key is not configured.');
        }

        $prompt = 'Embroidery or cross-stitch pattern design template, clean illustrative style, top-down or flat lay, '.
            'suitable as a craft project reference (not a photograph of a person). '.
            "Project title: {$title}. Details: {$description}";

        $prompt = mb_substr($prompt, 0, 3900);

        Log::info('OpenAI DALL·E: starting images/generations request', [
            'title_length' => mb_strlen($title),
            'description_length' => mb_strlen($description),
            'prompt_length' => mb_strlen($prompt),
            'prompt_preview' => mb_substr($prompt, 0, 200).'…',
            'model' => 'dall-e-3',
            'size' => '1024x1024',
        ]);

        /** @var Response $response */
        $response = $this->postImagesGenerationsWithRateLimitRetries($prompt);

        $status = $response->status();

        if (! $response->successful()) {
            $json = $response->json();
            $msg = is_array($json) ? ($json['error']['message'] ?? $response->body()) : $response->body();
            $errorType = is_array($json) ? ($json['error']['type'] ?? null) : null;
            $errorCode = is_array($json) ? ($json['error']['code'] ?? null) : null;

            Log::warning('OpenAI DALL·E: images/generations HTTP error', [
                'http_status' => $status,
                'error_type' => $errorType,
                'error_code' => $errorCode,
                'error_message' => is_string($msg) ? $msg : 'non-string message',
                'response_body_preview' => mb_substr($response->body(), 0, 1200),
            ]);

            $msg = is_string($msg) ? $msg : 'Image generation request failed.';

            throw new \RuntimeException($this->formatOpenAIImageErrorMessage($status, $msg));
        }

        Log::info('OpenAI DALL·E: images/generations succeeded', ['http_status' => $status]);

        $openaiUrl = $response->json('data.0.url');
        if (! is_string($openaiUrl) || $openaiUrl === '') {
            Log::error('OpenAI DALL·E: success response missing data.0.url', [
                'http_status' => $status,
                'json_keys' => array_keys(is_array($response->json()) ? $response->json() : []),
            ]);

            throw new \RuntimeException('No image URL in OpenAI response.');
        }

        Log::info('OpenAI DALL·E: downloading rendered image from temporary URL', [
            'url_host' => parse_url($openaiUrl, PHP_URL_HOST) ?: 'unknown',
        ]);

        /** @var Response $imageResponse */
        $imageResponse = Http::timeout(60)->get($openaiUrl);
        if (! $imageResponse->successful()) {
            Log::warning('OpenAI DALL·E: failed to download image bytes', [
                'http_status' => $imageResponse->status(),
                'body_preview' => mb_substr($imageResponse->body(), 0, 300),
            ]);

            throw new \RuntimeException('Failed to download generated image from OpenAI.');
        }

        $binary = $imageResponse->body();
        $byteLen = strlen($binary);
        Log::info('OpenAI DALL·E: image download complete', [
            'bytes' => $byteLen,
            'download_http_status' => $imageResponse->status(),
        ]);

        $filename = 'images/ai_template_'.uniqid('', true).'.png';

        Log::info('OpenAI DALL·E: uploading to S3', ['s3_key' => $filename]);

        Storage::disk('s3')->put($filename, $binary);
        try {
            Storage::disk('s3')->setVisibility($filename, 'public');
        } catch (\Throwable $e) {
            Log::warning('OpenAI DALL·E: S3 setVisibility failed (non-fatal)', ['message' => $e->getMessage()]);
        }

        Log::info('OpenAI DALL·E: template image stored', [
            's3_key' => $filename,
            'bytes' => $byteLen,
        ]);

        return [
            'path' => $filename,
            'preview_base64' => base64_encode($binary),
        ];
    }

    /**
     * POST /v1/images/generations with retries on HTTP 429 (exponential backoff).
     * Note: "Limit: 0/min" in the error body means the org has no image quota — retries will not help until limits increase.
     */
    private function postImagesGenerationsWithRateLimitRetries(string $prompt): Response
    {
        $payload = [
            'model' => 'dall-e-3',
            'prompt' => $prompt,
            'n' => 1,
            'size' => '1024x1024',
            'quality' => 'standard',
            'response_format' => 'url',
        ];

        $maxAttempts = 4;
        $response = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            /** @var Response $response */
            $response = Http::timeout(120)
                ->withToken($this->apiKey)
                ->post($this->baseUrl.'/images/generations', $payload);

            if ($response->successful()) {
                return $response;
            }

            if ($response->status() !== 429 || $attempt === $maxAttempts) {
                return $response;
            }

            $retryAfter = $response->header('Retry-After');
            $waitSeconds = is_numeric($retryAfter)
                ? min(90, max(1, (int) $retryAfter))
                : min(60, 2 ** $attempt);

            Log::warning('OpenAI DALL·E: HTTP 429 — waiting before retry', [
                'attempt' => $attempt,
                'max_attempts' => $maxAttempts,
                'wait_seconds' => $waitSeconds,
            ]);

            sleep($waitSeconds);
        }

        return $response;
    }

    private function formatOpenAIImageErrorMessage(int $httpStatus, string $openAiMessage): string
    {
        $lower = strtolower($openAiMessage);
        $isRate = $httpStatus === 429 || str_contains($lower, 'rate limit');

        if ($isRate) {
            return $openAiMessage.' — For org limits and tiers, see https://platform.openai.com/settings/organization/limits — '.
                'If the limit shows 0 images/minute, add billing or upgrade usage tier; waiting ~1 minute can help when the limit is 1/min.';
        }

        return $openAiMessage;
    }
}

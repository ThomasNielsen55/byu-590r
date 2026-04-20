<?php

namespace App\Http\Controllers\Api;

use App\Models\Pattern;

class PatternController extends BaseController
{
    /**
     * List patterns for embroidery single-select (catalog order).
     */
    public function index()
    {
        $patterns = Pattern::query()
            ->orderBy('name')
            ->get(['id', 'name', 'source', 'skill_level']);

        return $this->sendResponse($patterns, 'Patterns');
    }
}

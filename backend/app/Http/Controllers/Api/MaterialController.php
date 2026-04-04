<?php

namespace App\Http\Controllers\Api;

use App\Models\Material;

class MaterialController extends BaseController
{
    /**
     * List materials for embroidery multiselect (catalog order).
     */
    public function index()
    {
        $materials = Material::query()->orderBy('name')->get();

        return $this->sendResponse($materials, 'Materials');
    }
}

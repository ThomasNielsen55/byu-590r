<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class EmbroideryMaterial extends Pivot
{
    protected $table = 'embroidery_material';

    public $incrementing = true;

    protected $fillable = [
        'embroidery_id',
        'material_id',
        'quantity',
        'unit',
    ];
}

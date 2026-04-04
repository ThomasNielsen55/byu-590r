<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Material extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'kind',
        'dmc_number',
        'brand',
        'details',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function embroideries(): BelongsToMany
    {
        return $this->belongsToMany(Embroidery::class, 'embroidery_material')
            ->using(EmbroideryMaterial::class)
            ->withPivot(['id', 'quantity', 'unit'])
            ->withTimestamps();
    }
}

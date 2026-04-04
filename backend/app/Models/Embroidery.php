<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Embroidery extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'embroideries';

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'embroidery_picture',
        'start_date',
        'status',
        'difficulty_level',
        'fabric_type',
        'visibility_notes',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function completionLog(): HasOne
    {
        return $this->hasOne(CompletionLog::class);
    }

    public function materials(): BelongsToMany
    {
        return $this->belongsToMany(Material::class, 'embroidery_material')
            ->using(EmbroideryMaterial::class)
            ->withPivot(['id', 'quantity', 'unit'])
            ->withTimestamps();
    }

    public function patterns(): BelongsToMany
    {
        return $this->belongsToMany(Pattern::class, 'embroidery_pattern')
            ->withTimestamps();
    }
}

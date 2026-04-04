<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompletionLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'embroidery_id',
        'completed_at',
        'hours_spent',
        'satisfaction_rating',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'date',
            'hours_spent' => 'decimal:2',
        ];
    }

    public function embroidery(): BelongsTo
    {
        return $this->belongsTo(Embroidery::class);
    }
}

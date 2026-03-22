<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Embroidery extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'embroideries';

    protected $fillable = [
        'name',
        'description',
        'embroidery_picture',
        'created_at',
        'updated_at',
    ];
}

<?php

namespace Database\Seeders;

use App\Models\Pattern;
use Illuminate\Database\Seeder;

class PatternSeeder extends Seeder
{
    /**
     * Seed a small catalog of embroidery patterns for the single-select.
     */
    public function run(): void
    {
        $rows = [
            ['name' => 'Floral alphabet sampler', 'source' => 'Vintage transfers', 'skill_level' => 'intermediate'],
            ['name' => 'Sashiko geometric panel', 'source' => 'Traditional', 'skill_level' => 'beginner'],
            ['name' => 'Crewel bird & branch', 'source' => 'Jacobean', 'skill_level' => 'advanced'],
            ['name' => 'Cross-stitch border band', 'source' => 'Chart pack', 'skill_level' => 'beginner'],
            ['name' => 'Monogram wreath (3-letter)', 'source' => 'PDF', 'skill_level' => 'intermediate'],
        ];

        foreach ($rows as $row) {
            Pattern::firstOrCreate(
                ['name' => $row['name']],
                [
                    'user_id' => null,
                    'source' => $row['source'],
                    'skill_level' => $row['skill_level'],
                    'pattern_image' => null,
                ]
            );
        }
    }
}

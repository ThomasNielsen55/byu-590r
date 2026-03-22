<?php

namespace Database\Seeders;

use App\Models\Embroidery;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class EmbroiderySeeder extends Seeder
{
    /**
     * Seed five favorite embroidery / sewing projects with local or S3 image paths.
     */
    public function run(): void
    {
        $rows = [
            [
                'name' => 'Floral hoop sampler',
                'description' => 'A beginner-friendly hoop piece with satin stitch petals and stem stitch stems, perfect for learning thread tension.',
                'embroidery_picture' => 'images/hp1.jpeg',
            ],
            [
                'name' => 'Monogram linen napkin',
                'description' => 'Classic chain-stitch monogram on hemstitched linen; quick weekend project for table settings.',
                'embroidery_picture' => 'images/hp2.jpeg',
            ],
            [
                'name' => 'Visible-mending denim patch',
                'description' => 'Sashiko-inspired running stitches reinforce a knee tear while adding a bold geometric accent.',
                'embroidery_picture' => 'images/hp3.jpeg',
            ],
            [
                'name' => 'Crewel wool leaves',
                'description' => 'Textured crewel wool in long-and-short stitch for shaded autumn leaves on a wool ground.',
                'embroidery_picture' => 'images/mb1.jpg',
            ],
            [
                'name' => 'Cross-stitch bookmark',
                'description' => 'Tiny counted cross-stitch motif on evenweave, finished with a twisted cord and tassel.',
                'embroidery_picture' => 'images/mb2.jpg',
            ],
        ];

        foreach ($rows as $row) {
            Embroidery::updateOrCreate(
                ['name' => $row['name']],
                array_merge($row, [
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ])
            );
        }
    }
}

<?php

namespace Database\Seeders;

use App\Models\Material;
use Illuminate\Database\Seeder;

class MaterialSeeder extends Seeder
{
    /**
     * Seed a small shared catalog of floss, fabric, and notions for the embroidery multiselect.
     */
    public function run(): void
    {
        $rows = [
            ['name' => 'DMC 310 — Black', 'kind' => 'floss', 'dmc_number' => '310', 'brand' => 'DMC'],
            ['name' => 'DMC B5200 — White', 'kind' => 'floss', 'dmc_number' => 'B5200', 'brand' => 'DMC'],
            ['name' => 'DMC 666 — Christmas Red', 'kind' => 'floss', 'dmc_number' => '666', 'brand' => 'DMC'],
            ['name' => 'Evenweave 28 ct — Antique White', 'kind' => 'fabric', 'dmc_number' => null, 'brand' => null],
            ['name' => 'Linen ground — natural', 'kind' => 'fabric', 'dmc_number' => null, 'brand' => null],
            ['name' => 'Embroidery hoop — 6 in', 'kind' => 'notion', 'dmc_number' => null, 'brand' => null],
            ['name' => 'Water-soluble marker', 'kind' => 'notion', 'dmc_number' => null, 'brand' => null],
        ];

        foreach ($rows as $row) {
            Material::firstOrCreate(
                ['name' => $row['name']],
                [
                    'user_id' => null,
                    'kind' => $row['kind'],
                    'dmc_number' => $row['dmc_number'],
                    'brand' => $row['brand'],
                    'details' => null,
                ]
            );
        }
    }
}

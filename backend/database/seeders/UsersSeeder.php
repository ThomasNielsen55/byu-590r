<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
       
        $userData = [
            'name' => 'Thomas Test User',
            'email' => 'thomastestuser@test.com',
            'email_verified_at' => Carbon::now(),
            'avatar' => null,
            'password' => bcrypt('password12345'),
        ];
        
        User::updateOrCreate(
            ['email' => 'thomastestuser@test.com'],
            $userData
        );
        
    }
}


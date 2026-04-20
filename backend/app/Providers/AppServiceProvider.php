<?php

namespace App\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->app->booted(function () {
            $schedule = $this->app->make(Schedule::class);
            // Schedule overdue books email - change frequency as needed (currently every minute for testing)
            $schedule->command('auto:overdue-books --email=the.tomalars@gmail.com')
                // ->everyMinute()
                // Default schedule redirects stdout to /dev/null; this file shows real command output for debugging
                // ->appendOutputTo(storage_path('logs/schedule-overdue.log'));
                ->weekly(); // Uncomment for production
        });
    }
}

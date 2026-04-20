<?php

namespace App\Console\Commands;

use App\Mail\OverdueBooksMasterList;
use App\Models\Checkout;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AutoOverdueBooks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'auto:overdue-books {--email=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Returns a list of all overdue books to the admin user AND emails all overdue people';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $sendToEmail = $this->option('email');
        if (!$sendToEmail) {
            $this->error('Email option is required (--email=...)');
            return Command::FAILURE;
        }

        $overDueCheckouts = Checkout::whereNull('checkin_date')
            ->where('due_date', '<=', date('Y-m-d'))
            ->with(['users', 'books'])->get();

        if ($overDueCheckouts->count() === 0) {
            $this->warn('No overdue checkouts; email was not sent.');
            Log::info('auto:overdue-books skipped: zero overdue checkouts.');
            return Command::SUCCESS;
        }

        Log::info('auto:overdue-books sending mail', [
            'to' => $sendToEmail,
            'checkout_count' => $overDueCheckouts->count(),
        ]);

        try {
            Mail::to($sendToEmail)->send(new OverdueBooksMasterList($overDueCheckouts));
            $this->info('Overdue books report sent to ' . $sendToEmail . ' (' . $overDueCheckouts->count() . ' row(s)).');
            Log::info('auto:overdue-books mail sent successfully.');
        } catch (\Throwable $e) {
            $this->error('Failed to send email: ' . $e->getMessage());
            Log::error('Overdue books email failed', ['exception' => $e]);
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}


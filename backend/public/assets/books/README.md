# Demo book images (local development)

Place cover images here for **local development when S3 is not used**. They are copied to `storage/app/public/images/` by `php artisan app:setup-demo-images` (run during `make start`).

Expected filenames (matching the seeded book records):

- `bom.jpg`, `hp1.jpeg` … `hp7.jpeg`, `mb1.jpg`, `mb2.jpg`, `mb3.jpg`

For deployed environments, Terraform uploads these from `backend/public/assets/books/` to S3.

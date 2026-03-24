import Link from 'next/link';

export default function ArticleNotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Article not found</h1>
        <p className="mb-6 text-sm text-gray-600">
          The article may not exist or is not published.
        </p>
        <Link
          href="/home.html"
          className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Back to home
        </Link>
      </main>
    </div>
  );
}

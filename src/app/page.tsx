import Link from "next/link";

export default function HomePage() {
    return (
        <main className="bg-slate-50 px-4 py-12 text-slate-900 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-5xl">
                <section className="max-w-3xl">
                    <p className="text-sm font-semibold text-blue-700">
                        Welcome to LinkLab
                    </p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                        Find creative people to bring ideas to life.
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                        LinkLab is a collaboration platform for creatives looking
                        for collaborators and like-minded people to work on
                        projects together. Share ideas, visual references, creative
                        taste, and the process behind your work.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href="/posts"
                            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Browse collaboration posts
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                            Create an account
                        </Link>
                    </div>
                </section>

                <section className="mt-16">
                    <h2 className="text-2xl font-bold">
                        What LinkLab offers today
                    </h2>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="font-semibold">Collaboration posts</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Create and browse opportunities to find the right
                                people for a project.
                            </p>
                        </article>

                        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="font-semibold">Applications</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Apply to a post with a message and keep track of
                                opportunities you have already contacted.
                            </p>
                        </article>

                        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="font-semibold">Galleries and moodboards</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                Organise visual references, document your taste,
                                and share published galleries with others.
                            </p>
                        </article>
                    </div>
                </section>

                <section className="mt-12 rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        Coming next: messaging
                    </h2>
                    <p className="mt-2 max-w-2xl leading-7 text-slate-600">
                        Messaging is planned for a future update, so collaborators
                        can continue a conversation after discovering a project.
                    </p>
                </section>
            </div>
        </main>
    );
}

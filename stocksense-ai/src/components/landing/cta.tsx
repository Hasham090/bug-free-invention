import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center rounded-2xl border bg-gradient-to-br from-primary/5 via-indigo-500/5 to-purple-500/5 p-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Your next warehouse audit could take 4 seconds.
        </h2>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          Connect your store, answer three questions, and get the first 50 AI actions in under five minutes.
        </p>
        <Button asChild size="lg" className="mt-8 gap-2">
          <Link href="/sign-up">
            Start your free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

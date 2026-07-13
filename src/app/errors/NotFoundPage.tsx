import { FileQuestionIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="justify-items-center">
          <FileQuestionIcon
            aria-hidden="true"
            className="size-10 text-muted-foreground"
          />
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <CardTitle>
            <h1>Page not found</h1>
          </CardTitle>
          <CardDescription>
            The page you requested does not exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">Go to overview</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

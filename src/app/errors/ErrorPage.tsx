import { useEffect } from 'react'
import { CircleAlertIcon } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  if (isRouteErrorResponse(error)) {
    return error.statusText || `Request failed with status ${error.status}.`
  }

  return 'We could not complete your request. Please try again.'
}

export function ErrorPage() {
  const error = useRouteError()
  const message = getErrorMessage(error)

  useEffect(() => {
    console.error('[application] Unhandled route error.', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-4">
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>
            <h1>Something went wrong</h1>
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.location.reload()} type="button">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Go to overview</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}

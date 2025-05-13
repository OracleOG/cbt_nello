'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signInSchema } from "@/lib/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginForm() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(signInSchema),
  })

  const onSubmit = async (data) => {
    const result = await signIn('credentials', {
      redirect: false,
      username: data.username,
      password: data.password,
    })

    if (result?.ok) {
      router.push('/dashboard')
    } else {
      alert(result?.error || 'Invalid credentials')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}
    method="POST"
    action="api/auth/callback/credentials"
    autoComplete="on">
      <div>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          {...register('username')}
          autoComplete="username"
          name="username"
        />
        {errors.username && (
          <p>{errors.username.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          {...register('password')}
          autoComplete="current-password"
          name="password"
        />
        {errors.password && (
          <p>{errors.password.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  )
}

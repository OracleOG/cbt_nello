'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@/lib/zod';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(signInSchema),
  });

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const onSubmit = async (data) => {
    const result = await signIn('credentials', {
      redirect: false,
      username: data.username,
      password: data.password,
      callbackUrl: '/dashboard'
    });

    if (result?.error) {
      alert(result.error);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Welcome Back</h1>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              className={errors.username ? styles.formInputError : styles.formInput}
              {...register('username')}
            />
            {errors.username && (
              <span className={styles.errorMessage}>{errors.username.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className={errors.password ? styles.formInputError : styles.formInput}
              {...register('password')}
            />
            {errors.password && (
              <span className={styles.errorMessage}>{errors.password.message}</span>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={styles.loginBtn}
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className={styles.additionalLinks}>
          <p>
            <a href="/forgot-password">Forgot Password?</a>
          </p>
          <p>
            Dont have an account? <a href="/register">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
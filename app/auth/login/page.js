'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema } from '@/lib/zod';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Attempting to sign in with:', { username: data.username });
      
      const result = await signIn('credentials', {
        redirect: false,
        username: data.username,
        password: data.password,
        callbackUrl: '/dashboard'
      });

      console.log('Sign in result:', result);

      if (result?.error) {
        setError(result.error);
        console.error('Sign in error:', result.error);
      } else if (result?.ok) {
        console.log('Sign in successful, redirecting...');
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Welcome Back</h1>
        
        {error && (
          <div className={styles.errorMessage} style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
            {error}
          </div>
        )}
        
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
            disabled={isSubmitting || isLoading}
            className={styles.loginBtn}
          >
            {isSubmitting || isLoading ? 'Logging in...' : 'Log In'}
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
import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import PasskeyVerify from '@/components/passkey-verify';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

/**
 * Random token so the browser never recognises this as a
 * "known" login form and stops offering to save/autofill.
 */
const nonce = Math.random().toString(36).slice(2);

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
                autoComplete="off"
                data-form-type="other"
            >
                {({ processing, errors }) => (
                    <>
                        {/* ---- Hidden decoy fields: absorb browser autofill ---- */}
                        <div
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                left: '-9999px',
                                width: 1,
                                height: 1,
                                overflow: 'hidden',
                                opacity: 0,
                                pointerEvents: 'none',
                            }}
                        >
                            <input
                                type="text"
                                name={`fakeusernameremembered-${nonce}`}
                                autoComplete="username"
                                tabIndex={-1}
                            />
                            <input
                                type="password"
                                name={`fakepasswordremembered-${nonce}`}
                                autoComplete="current-password"
                                tabIndex={-1}
                            />
                        </div>

                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="new-password"
                                    data-form-type="other"
                                    data-lpignore="true"
                                    data-1p-ignore
                                    data-bwignore
                                    data-protonpass-ignore
                                    placeholder="email@example.com"
                                    spellCheck={false}
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot your password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="new-password"
                                    data-form-type="other"
                                    data-lpignore="true"
                                    data-1p-ignore
                                    data-bwignore
                                    data-protonpass-ignore
                                    placeholder="Password"
                                    spellCheck={false}
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        {/* <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <TextLink href={register()} tabIndex={5}>
                                Sign up
                            </TextLink>
                        </div> */}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};

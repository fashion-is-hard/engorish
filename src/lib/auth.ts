import { supabase } from "./supabaseClient";
import { getSignupAppFromPath } from "./abVariant";

export async function signUpWithProfile(
  email: string,
  password: string,
  name: string,
  gender: string,
  age: number,
  exchangeStatus: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("User not created");

  const signupApp = getSignupAppFromPath(window.location.pathname);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    name,
    gender,
    age,
    exchange_status: exchangeStatus,
    signup_app: signupApp,
  });

  if (profileError) throw profileError;

  return user;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

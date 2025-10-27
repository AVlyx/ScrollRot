import { auth } from "../config/firebase-init";
import {
  GoogleAuthProvider,
  signInWithCredential,
  type User,
  type UserCredential,
} from "firebase/auth/web-extension";

export async function getChromeEmailProfile(): Promise<string | null> {
  const { email } = await chrome.identity.getProfileUserInfo();
  console.log({ email });
  return email || null;
}

export async function getAuthToken(): Promise<string | null> {
  const { token } = await chrome.identity.getAuthToken({ interactive: true });
  console.log({ token });
  return token || null;
}

export async function authenticateUser(token: string): Promise<User> {
  const ocredential = GoogleAuthProvider.credential(null, token);
  //   console.log({ ocredential });
  const userCred: UserCredential = await signInWithCredential(auth, ocredential);
  //   console.log({ userCred });
  return userCred.user;
}

export async function getAuthenticatedUser(): Promise<User> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Could not get Auth Token");
  }
  return authenticateUser(token);
}

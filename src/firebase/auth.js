import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import app from "./config";

export const auth = getAuth(app);

export const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);
// bcrypt work factor for password hashing, shared by every hashing call site
// (signup, change password, reset password). 10 is the OWASP-recommended floor;
// with the pure-JS bcryptjs each +1 doubles the (already JS-slow) hash time, so
// raise it further only after switching to native bcrypt/argon2. Existing hashes
// keep working after a change — bcrypt embeds the cost in the hash itself.
export const BCRYPT_SALT_ROUNDS = 10;

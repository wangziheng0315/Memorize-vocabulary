import { auth } from 'app/auth';
import { SignOutForm } from 'app/components/sign-out-form';

export default async function ProtectedPage() {
  let session = await auth();

  return (
    <div className="flex h-screen bg-black">
      <div className="w-screen h-screen flex flex-col space-y-5 justify-center items-center text-white">
        You are logged in as {session?.user?.email}
        <SignOutForm compact />
      </div>
    </div>
  );
}

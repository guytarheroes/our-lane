export const POST = ({ cookies, redirect }) => {
  cookies.delete('session', { path: '/' });
  return redirect('/', 303);
};

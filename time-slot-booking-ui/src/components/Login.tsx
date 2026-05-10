import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Github } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');
    if (token) {
      localStorage.setItem('auth_token', token);
      navigate('/');
    }
  }, [location, navigate]);

  const handleLogin = (provider: string) => {
    window.location.href = `http://localhost:8080/login/${provider}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Choose your preferred login method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full py-6 flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
            onClick={() => handleLogin('github')}
          >
            <Github className="h-5 w-5" />
            <span>Continue with GitHub</span>
          </Button>

          <Button 
            variant="outline" 
            className="w-full py-6 flex items-center justify-center gap-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            onClick={() => handleLogin('atlassian')}
          >
            <img 
              src="https://www.atlassian.com/favicon.ico" 
              alt="Atlassian" 
              className="h-5 w-5"
            />
            <span>Continue with Atlassian</span>
          </Button>
          
          <div className="pt-4 text-center text-xs text-gray-500">
            Secure authentication powered by OAuth 2.0
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden p-4">
            <Card className="z-10 text-center flex flex-col items-center max-w-lg w-full p-10 shadow-lg">
                <div className="relative mb-6">
                    <h1 className="text-8xl md:text-9xl font-extrabold text-primary tracking-tighter relative z-10">
                        404
                    </h1>
                </div>

                <div className="space-y-6 w-full">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Page Not Found
                    </h2>

                    <p className="text-base text-muted-foreground max-w-sm mx-auto">
                        We can't seem to find the page you're looking for. It might have been moved, deleted, or never existed.
                    </p>

                    <div className="flex flex-col gap-3 justify-center items-center w-full mt-4">
                        <Button className="w-full" onClick={() => navigate('/')}>
                            <Home className="h-4 w-4" />
                            Go Back Home
                        </Button>

                        <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                            <RefreshCw className="h-4 w-4" />
                            Refresh Page
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default NotFound;

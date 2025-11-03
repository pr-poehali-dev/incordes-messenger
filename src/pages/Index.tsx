import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface User {
  id: number;
  incordesId: string;
  email: string;
  username: string;
  discriminator: string;
  avatarUrl?: string;
}

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'friends' | 'dms' | 'servers'>('friends');
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('incordesUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('https://functions.poehali.dev/7d83d4d9-e2d5-406f-9cea-36741c393896', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRegistering ? 'register' : 'login',
          email,
          username: isRegistering ? username : undefined,
          password
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Ошибка аутентификации');
        setLoading(false);
        return;
      }

      setCurrentUser(data);
      localStorage.setItem('incordesUser', JSON.stringify(data));
      setIsLoggedIn(true);
      setLoading(false);
    } catch (err) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('incordesUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6 bg-card border-border">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <Icon name="MessageCircle" size={28} className="text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Incordes</h1>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {isRegistering ? 'Создать аккаунт' : 'С возвращением!'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRegistering 
                ? 'Присоединяйтесь к Incordes — общайтесь с друзьями!' 
                : 'Рады видеть вас снова!'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Имя пользователя</label>
                <Input
                  type="text"
                  placeholder="Ваше имя"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Пароль</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              onClick={handleAuth}
              disabled={loading || !email || !password || (isRegistering && !username)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Загрузка...' : isRegistering ? 'Зарегистрироваться' : 'Войти'}
            </Button>

            <div className="text-center">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-sm text-primary hover:underline"
              >
                {isRegistering 
                  ? 'Уже есть аккаунт? Войти' 
                  : 'Нужен аккаунт? Зарегистрироваться'}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Регистрируясь, вы принимаете{' '}
              <a href="#" className="text-primary hover:underline">Условия использования</a>
              {' '}и{' '}
              <a href="#" className="text-primary hover:underline">Политику конфиденциальности</a>
            </p>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Связь: connection.suppor@gmail.com
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-[72px] bg-sidebar flex flex-col items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/80 hover:rounded-2xl transition-all duration-200"
          onClick={() => setActiveView('friends')}
        >
          <Icon name="Home" size={24} className="text-primary-foreground" />
        </Button>
        
        <div className="w-8 h-0.5 bg-sidebar-border rounded-full my-1" />
        
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-sidebar-accent hover:bg-primary hover:rounded-2xl transition-all duration-200"
          onClick={() => setActiveView('servers')}
        >
          <Icon name="Plus" size={24} className="text-sidebar-foreground" />
        </Button>
      </div>

      <div className="w-60 bg-card flex flex-col">
        <div className="h-12 px-4 flex items-center shadow-sm border-b border-border">
          <Input
            placeholder="Найти или начать разговор"
            className="h-7 text-sm bg-secondary border-0 focus-visible:ring-1"
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary">
                <TabsTrigger value="friends" className="text-xs">
                  <Icon name="Users" size={16} className="mr-1" />
                  Друзья
                </TabsTrigger>
                <TabsTrigger value="dms" className="text-xs">
                  <Icon name="MessageSquare" size={16} className="mr-1" />
                  Личные
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 space-y-1">
              {activeView === 'friends' && (
                <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                  <Icon name="UserPlus" size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Пока нет друзей</p>
                  <p className="text-xs mt-1">Добавьте друга по Incordes ID</p>
                </div>
              )}
              
              {activeView === 'dms' && (
                <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                  <Icon name="Mail" size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Нет сообщений</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="h-14 px-2 bg-sidebar flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.username}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                #{currentUser?.discriminator}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleLogout}
          >
            <Icon name="LogOut" size={16} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between shadow-sm border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="Users" size={20} className="text-muted-foreground" />
            <h2 className="font-semibold text-foreground">
              {activeView === 'friends' ? 'Друзья' : activeView === 'dms' ? 'Личные сообщения' : 'Серверы'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Icon name="Settings" size={20} className="text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center space-y-4 p-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-card flex items-center justify-center">
              <Icon name="MessageCircle" size={32} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Добро пожаловать в Incordes!</h3>
              <p className="text-muted-foreground max-w-md">
                Ваш Incordes ID: <span className="text-primary font-mono font-semibold">{currentUser?.incordesId}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Поделитесь своим ID с друзьями, чтобы они могли добавить вас
              </p>
            </div>
            
            <div className="flex gap-3 justify-center pt-4">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Icon name="UserPlus" size={18} className="mr-2" />
                Добавить друга
              </Button>
              <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
                <Icon name="Plus" size={18} className="mr-2" />
                Создать сервер
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface User {
  id: number;
  incordesId: string;
  email: string;
  username: string;
  discriminator: string;
  avatarUrl?: string;
}

interface Friend {
  id: number;
  incordesId: string;
  username: string;
  discriminator: string;
  avatarUrl?: string;
  status: string;
  friendStatus: string;
}

interface Server {
  id: number;
  name: string;
  iconUrl?: string;
  ownerId: number;
}

interface Channel {
  id: number;
  name: string;
  iconUrl?: string;
  description?: string;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  sender: {
    id: number;
    username: string;
    discriminator: string;
    avatarUrl?: string;
  };
}

const API_URLS = {
  auth: 'https://functions.poehali.dev/7d83d4d9-e2d5-406f-9cea-36741c393896',
  friends: 'https://functions.poehali.dev/c866aac5-aff0-414c-882c-5dc14462d78b',
  servers: 'https://functions.poehali.dev/ab0bbc69-53a8-4eaf-9e08-999daa2757d9',
  messages: 'https://functions.poehali.dev/e48c88da-320a-45c1-ab9f-6f67b178c859'
};

export default function Index() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'friends' | 'dms' | 'servers'>('friends');
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');

  const [addFriendDialog, setAddFriendDialog] = useState(false);
  const [createServerDialog, setCreateServerDialog] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [serverNameInput, setServerNameInput] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('incordesUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      loadFriends(user.id);
      loadServers(user.id);
    }
  }, []);

  useEffect(() => {
    if (selectedChannel && currentUser) {
      loadMessages(selectedChannel.id, null);
    }
  }, [selectedChannel, currentUser]);

  useEffect(() => {
    if (selectedFriend && currentUser) {
      loadMessages(null, selectedFriend.id);
    }
  }, [selectedFriend, currentUser]);

  const loadFriends = async (userId: number) => {
    try {
      const response = await fetch(API_URLS.friends, {
        headers: { 'X-User-Id': userId.toString() }
      });
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const loadServers = async (userId: number) => {
    try {
      const response = await fetch(API_URLS.servers, {
        headers: { 'X-User-Id': userId.toString() }
      });
      const data = await response.json();
      setServers(data.servers || []);
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  };

  const loadChannels = async (serverId: number) => {
    try {
      const response = await fetch(`${API_URLS.servers}?serverId=${serverId}`, {
        headers: { 'X-User-Id': currentUser!.id.toString() }
      });
      const data = await response.json();
      setChannels(data.channels || []);
      if (data.channels && data.channels.length > 0) {
        setSelectedChannel(data.channels[0]);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const loadMessages = async (channelId: number | null, recipientId: number | null) => {
    try {
      const params = channelId 
        ? `channelId=${channelId}` 
        : `recipientId=${recipientId}`;
      const response = await fetch(`${API_URLS.messages}?${params}`, {
        headers: { 'X-User-Id': currentUser!.id.toString() }
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleAuth = async () => {
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch(API_URLS.auth, {
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
      loadFriends(data.id);
      loadServers(data.id);
      setLoading(false);
    } catch (err) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!friendIdInput || !currentUser) return;
    
    try {
      const response = await fetch(API_URLS.friends, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString()
        },
        body: JSON.stringify({
          action: 'add',
          incordesId: friendIdInput
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Заявка отправлена!', description: 'Ждите подтверждения от пользователя' });
        setAddFriendDialog(false);
        setFriendIdInput('');
        loadFriends(currentUser.id);
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить заявку', variant: 'destructive' });
    }
  };

  const handleCreateServer = async () => {
    if (!serverNameInput || !currentUser) return;
    
    try {
      const response = await fetch(API_URLS.servers, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString()
        },
        body: JSON.stringify({
          action: 'createServer',
          name: serverNameInput
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Сервер создан!', description: `Сервер "${serverNameInput}" успешно создан` });
        setCreateServerDialog(false);
        setServerNameInput('');
        loadServers(currentUser.id);
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось создать сервер', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentUser) return;
    
    try {
      const response = await fetch(API_URLS.messages, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id.toString()
        },
        body: JSON.stringify({
          content: messageInput,
          channelId: selectedChannel?.id || null,
          recipientId: selectedFriend?.id || null
        })
      });

      if (response.ok) {
        setMessageInput('');
        if (selectedChannel) {
          loadMessages(selectedChannel.id, null);
        } else if (selectedFriend) {
          loadMessages(null, selectedFriend.id);
        }
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('incordesUser');
    setCurrentUser(null);
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setUsername('');
    setFriends([]);
    setServers([]);
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
          onClick={() => {
            setActiveView('friends');
            setSelectedServer(null);
            setSelectedChannel(null);
            setSelectedFriend(null);
          }}
        >
          <Icon name="Home" size={24} className="text-primary-foreground" />
        </Button>
        
        <div className="w-8 h-0.5 bg-sidebar-border rounded-full my-1" />
        
        {servers.map(server => (
          <Button
            key={server.id}
            variant="ghost"
            size="icon"
            className={`w-12 h-12 rounded-full hover:rounded-2xl transition-all duration-200 ${
              selectedServer?.id === server.id ? 'bg-primary' : 'bg-sidebar-accent hover:bg-primary'
            }`}
            onClick={() => {
              setSelectedServer(server);
              setActiveView('servers');
              setSelectedFriend(null);
              loadChannels(server.id);
            }}
          >
            <span className="text-sidebar-foreground font-semibold">
              {server.name[0].toUpperCase()}
            </span>
          </Button>
        ))}

        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-sidebar-accent hover:bg-primary hover:rounded-2xl transition-all duration-200"
          onClick={() => setCreateServerDialog(true)}
        >
          <Icon name="Plus" size={24} className="text-sidebar-foreground" />
        </Button>
      </div>

      <div className="w-60 bg-card flex flex-col">
        <div className="h-12 px-4 flex items-center shadow-sm border-b border-border">
          {selectedServer ? (
            <h2 className="font-semibold text-foreground truncate">{selectedServer.name}</h2>
          ) : (
            <Input
              placeholder="Найти или начать разговор"
              className="h-7 text-sm bg-secondary border-0 focus-visible:ring-1"
            />
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {selectedServer ? (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                  Текстовые каналы
                </div>
                {channels.map(channel => (
                  <Button
                    key={channel.id}
                    variant="ghost"
                    className={`w-full justify-start text-sm ${
                      selectedChannel?.id === channel.id ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                    }`}
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <Icon name="Hash" size={18} className="mr-2" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            ) : (
              <>
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
                    <>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={() => setAddFriendDialog(true)}
                      >
                        <Icon name="UserPlus" size={18} className="mr-2 text-primary" />
                        Добавить друга
                      </Button>
                      {friends.filter(f => f.friendStatus === 'accepted').map(friend => (
                        <Button
                          key={friend.id}
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            setSelectedFriend(friend);
                            setActiveView('dms');
                          }}
                        >
                          <Avatar className="w-6 h-6 mr-2">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {friend.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {friend.username}
                        </Button>
                      ))}
                      {friends.filter(f => f.friendStatus === 'accepted').length === 0 && (
                        <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                          <Icon name="UserPlus" size={32} className="mx-auto mb-2 opacity-50" />
                          <p>Пока нет друзей</p>
                          <p className="text-xs mt-1">Добавьте друга по Incordes ID</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {activeView === 'dms' && (
                    <>
                      {friends.filter(f => f.friendStatus === 'accepted').map(friend => (
                        <Button
                          key={friend.id}
                          variant="ghost"
                          className={`w-full justify-start text-sm ${
                            selectedFriend?.id === friend.id ? 'bg-secondary' : ''
                          }`}
                          onClick={() => setSelectedFriend(friend)}
                        >
                          <Avatar className="w-6 h-6 mr-2">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {friend.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {friend.username}
                        </Button>
                      ))}
                      {friends.filter(f => f.friendStatus === 'accepted').length === 0 && (
                        <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                          <Icon name="Mail" size={32} className="mx-auto mb-2 opacity-50" />
                          <p>Нет сообщений</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
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
            {selectedChannel ? (
              <>
                <Icon name="Hash" size={20} className="text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{selectedChannel.name}</h2>
              </>
            ) : selectedFriend ? (
              <>
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {selectedFriend.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-foreground">{selectedFriend.username}</h2>
              </>
            ) : (
              <>
                <Icon name="Users" size={20} className="text-muted-foreground" />
                <h2 className="font-semibold text-foreground">Друзья</h2>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Icon name="Settings" size={20} className="text-muted-foreground" />
            </Button>
          </div>
        </div>

        {selectedChannel || selectedFriend ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className="flex gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {msg.sender.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-foreground">{msg.sender.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-foreground">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder={`Сообщение ${selectedChannel ? `#${selectedChannel.name}` : `@${selectedFriend?.username}`}`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[44px] max-h-32 resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="self-end"
                >
                  <Icon name="Send" size={18} />
                </Button>
              </div>
            </div>
          </>
        ) : (
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
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setAddFriendDialog(true)}
                >
                  <Icon name="UserPlus" size={18} className="mr-2" />
                  Добавить друга
                </Button>
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-secondary"
                  onClick={() => setCreateServerDialog(true)}
                >
                  <Icon name="Plus" size={18} className="mr-2" />
                  Создать сервер
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={addFriendDialog} onOpenChange={setAddFriendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить друга</DialogTitle>
            <DialogDescription>
              Введите Incordes ID пользователя для отправки заявки в друзья
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="INCRD-XXXX-XXXX"
              value={friendIdInput}
              onChange={(e) => setFriendIdInput(e.target.value)}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFriendDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddFriend} disabled={!friendIdInput}>
              Отправить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createServerDialog} onOpenChange={setCreateServerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать сервер</DialogTitle>
            <DialogDescription>
              Дайте название вашему новому серверу
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Мой крутой сервер"
              value={serverNameInput}
              onChange={(e) => setServerNameInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateServerDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateServer} disabled={!serverNameInput}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { message } from 'antd';
import { LoadGlobalCookies, AddGlobalCookies, DeleteGlobalCookie } from '../../wailsjs/go/main/App';

export const useCookieHandlers = () => {
  const [globalCookies, setGlobalCookies] = useState<any[]>([]);
  const [cookieInput, setCookieInput] = useState('');

  const handleLoadCookies = useCallback(async () => {
    try {
      const data = await LoadGlobalCookies();
      setGlobalCookies(data ? JSON.parse(data) : []);
    } catch (error) {
      console.error('Failed to load cookies:', error);
      setGlobalCookies([]);
    }
  }, []);

  const handleSaveCookies = useCallback(async () => {
    if (!cookieInput.trim()) {
      message.warning('请输入 set-cookie 内容');
      return;
    }
    try {
      await AddGlobalCookies(cookieInput);
      message.success('Cookie 保存成功');
      setCookieInput('');
      handleLoadCookies();
    } catch (error) {
      message.error('保存失败');
    }
  }, [cookieInput, handleLoadCookies]);

  const handleDeleteCookie = useCallback(async (id: string) => {
    try {
      await DeleteGlobalCookie(id);
      message.success('Cookie 已删除');
      handleLoadCookies();
    } catch (error) {
      message.error('删除失败');
    }
  }, [handleLoadCookies]);

  return {
    globalCookies,
    setGlobalCookies,
    cookieInput,
    setCookieInput,
    handleLoadCookies,
    handleSaveCookies,
    handleDeleteCookie,
  };
};

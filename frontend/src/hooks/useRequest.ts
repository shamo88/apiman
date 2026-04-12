import { useCallback } from 'react';
import { message } from 'antd';
import { useWorkspaceStore } from '../store';
import { ApiConfig } from '../constants/defaults';
import { toWailsHttpSpec } from '../utils/curlUtils';
import {
  ExecuteHTTPRequestWithScripts,
  ExecuteCurl,
} from '../../wailsjs/go/main/App';

export function useRequest() {
  const { executing, setExecuting, setResponse, setFormattedResponse } = useWorkspaceStore();

  const executeRequest = useCallback(async (
    projectId: string,
    envId: string,
    apiConfig: ApiConfig,
    preScriptIds: string[] = [],
    postScriptIds: string[] = [],
    requestName: string = '',
    requestPath: string = ''
  ) => {
    setExecuting(true);
    try {
      const spec = toWailsHttpSpec(apiConfig);

      let response;
      // Always use ExecuteHTTPRequestWithScripts to ensure environment variables and globals are substituted
      response = await ExecuteHTTPRequestWithScripts(
        projectId,
        requestName || 'api',
        requestName || 'request',
        requestPath,
        envId,
        spec,
        preScriptIds,
        postScriptIds
      );

      setResponse(projectId, response);

      // Format response body
      if (response?.body) {
        try {
          const json = JSON.parse(response.body);
          setFormattedResponse(JSON.stringify(json, null, 2));
        } catch {
          setFormattedResponse(response.body);
        }
      }

      return response;
    } catch (error: any) {
      message.error(`请求失败: ${error?.message || error}`);
      throw error;
    } finally {
      setExecuting(false);
    }
  }, [setExecuting, setResponse, setFormattedResponse]);

  const executeCurl = useCallback(async (command: string) => {
    setExecuting(true);
    try {
      const response = await ExecuteCurl(command);
      setFormattedResponse('');
      return response;
    } catch (error: any) {
      message.error(`执行失败: ${error?.message || error}`);
      throw error;
    } finally {
      setExecuting(false);
    }
  }, [setExecuting, setFormattedResponse]);

  return {
    executing,
    executeRequest,
    executeCurl,
  };
}

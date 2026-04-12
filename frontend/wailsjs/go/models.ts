export namespace config {
	
	export class HTTPConfig {
	    timeout: number;
	
	    static createFrom(source: any = {}) {
	        return new HTTPConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeout = source["timeout"];
	    }
	}
	export class LogConfig {
	    maxSizeMB: number;
	    maxBackups: number;
	    compress: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LogConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.maxSizeMB = source["maxSizeMB"];
	        this.maxBackups = source["maxBackups"];
	        this.compress = source["compress"];
	    }
	}
	export class MCPConfig {
	    enabled: boolean;
	    port: number;
	    project_id: string;
	    environment_id: string;
	    api_key: string;
	
	    static createFrom(source: any = {}) {
	        return new MCPConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.port = source["port"];
	        this.project_id = source["project_id"];
	        this.environment_id = source["environment_id"];
	        this.api_key = source["api_key"];
	    }
	}
	export class GitSyncConfig {
	    enabled: boolean;
	    remoteUrl?: string;
	    branch?: string;
	    authType?: string;
	    password?: string;
	    autoSync: boolean;
	    workDir?: string;
	
	    static createFrom(source: any = {}) {
	        return new GitSyncConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.remoteUrl = source["remoteUrl"];
	        this.branch = source["branch"];
	        this.authType = source["authType"];
	        this.password = source["password"];
	        this.autoSync = source["autoSync"];
	        this.workDir = source["workDir"];
	    }
	}
	export class UIConfig {
	    enableListAnimation: boolean;
	    theme: string;
	
	    static createFrom(source: any = {}) {
	        return new UIConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enableListAnimation = source["enableListAnimation"];
	        this.theme = source["theme"];
	    }
	}
	export class ProxyConfig {
	    enabled: boolean;
	    httpHost?: string;
	    httpPort?: number;
	    httpsHost?: string;
	    httpsPort?: number;
	    socks5Host?: string;
	    socks5Port?: number;
	
	    static createFrom(source: any = {}) {
	        return new ProxyConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.httpHost = source["httpHost"];
	        this.httpPort = source["httpPort"];
	        this.httpsHost = source["httpsHost"];
	        this.httpsPort = source["httpsPort"];
	        this.socks5Host = source["socks5Host"];
	        this.socks5Port = source["socks5Port"];
	    }
	}
	export class AppConfig {
	    proxy: ProxyConfig;
	    ui: UIConfig;
	    gitSync: GitSyncConfig;
	    mcp: MCPConfig;
	    log: LogConfig;
	    http: HTTPConfig;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.proxy = this.convertValues(source["proxy"], ProxyConfig);
	        this.ui = this.convertValues(source["ui"], UIConfig);
	        this.gitSync = this.convertValues(source["gitSync"], GitSyncConfig);
	        this.mcp = this.convertValues(source["mcp"], MCPConfig);
	        this.log = this.convertValues(source["log"], LogConfig);
	        this.http = this.convertValues(source["http"], HTTPConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	

}

export namespace models {
	
	export class HttpRequestSpec {
	    method: string;
	    http_url: string;
	    headers: RequestKeyVal[];
	    params: RequestKeyVal[];
	    body: string;
	    body_type: string;
	    form_data: RequestPair[];
	    url_encoded: RequestPair[];
	    cookies: RequestKeyVal[];
	
	    static createFrom(source: any = {}) {
	        return new HttpRequestSpec(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.http_url = source["http_url"];
	        this.headers = this.convertValues(source["headers"], RequestKeyVal);
	        this.params = this.convertValues(source["params"], RequestKeyVal);
	        this.body = source["body"];
	        this.body_type = source["body_type"];
	        this.form_data = this.convertValues(source["form_data"], RequestPair);
	        this.url_encoded = this.convertValues(source["url_encoded"], RequestPair);
	        this.cookies = this.convertValues(source["cookies"], RequestKeyVal);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HttpRequestCase {
	    id: string;
	    name: string;
	    spec: HttpRequestSpec;
	
	    static createFrom(source: any = {}) {
	        return new HttpRequestCase(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.spec = this.convertValues(source["spec"], HttpRequestSpec);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RequestPair {
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RequestPair(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class RequestKeyVal {
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RequestKeyVal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class CurlRequest {
	    id: string;
	    name: string;
	    project_id: string;
	    folder_id: string;
	    path: string;
	    content?: string;
	    pre_scripts?: string[];
	    post_scripts?: string[];
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	    method?: string;
	    http_url?: string;
	    headers?: RequestKeyVal[];
	    params?: RequestKeyVal[];
	    body?: string;
	    body_type?: string;
	    form_data?: RequestPair[];
	    url_encoded?: RequestPair[];
	    cases?: HttpRequestCase[];
	    interface_spec?: HttpRequestSpec;
	
	    static createFrom(source: any = {}) {
	        return new CurlRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.project_id = source["project_id"];
	        this.folder_id = source["folder_id"];
	        this.path = source["path"];
	        this.content = source["content"];
	        this.pre_scripts = source["pre_scripts"];
	        this.post_scripts = source["post_scripts"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	        this.method = source["method"];
	        this.http_url = source["http_url"];
	        this.headers = this.convertValues(source["headers"], RequestKeyVal);
	        this.params = this.convertValues(source["params"], RequestKeyVal);
	        this.body = source["body"];
	        this.body_type = source["body_type"];
	        this.form_data = this.convertValues(source["form_data"], RequestPair);
	        this.url_encoded = this.convertValues(source["url_encoded"], RequestPair);
	        this.cases = this.convertValues(source["cases"], HttpRequestCase);
	        this.interface_spec = this.convertValues(source["interface_spec"], HttpRequestSpec);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ResponseCookie {
	    name: string;
	    value: string;
	    domain: string;
	    path: string;
	    expires: string;
	    http_only: boolean;
	    secure: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ResponseCookie(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.value = source["value"];
	        this.domain = source["domain"];
	        this.path = source["path"];
	        this.expires = source["expires"];
	        this.http_only = source["http_only"];
	        this.secure = source["secure"];
	    }
	}
	export class TestResult {
	    name: string;
	    passed: boolean;
	    message?: string;
	    duration: number;
	
	    static createFrom(source: any = {}) {
	        return new TestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.passed = source["passed"];
	        this.message = source["message"];
	        this.duration = source["duration"];
	    }
	}
	export class CurlResponse {
	    status_code: number;
	    headers: Record<string, Array<string>>;
	    body: string;
	    duration: number;
	    error: string;
	    script_logs?: string[];
	    tests?: TestResult[];
	    cookies?: ResponseCookie[];
	    curl_command?: string;
	
	    static createFrom(source: any = {}) {
	        return new CurlResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status_code = source["status_code"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.duration = source["duration"];
	        this.error = source["error"];
	        this.script_logs = source["script_logs"];
	        this.tests = this.convertValues(source["tests"], TestResult);
	        this.cookies = this.convertValues(source["cookies"], ResponseCookie);
	        this.curl_command = source["curl_command"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Environment {
	    id: string;
	    name: string;
	    variables: Record<string, string>;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Environment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.variables = source["variables"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Folder {
	    id: string;
	    name: string;
	    project_id: string;
	    parent_id: string;
	    path: string;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Folder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.project_id = source["project_id"];
	        this.parent_id = source["parent_id"];
	        this.path = source["path"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FolderScriptsResult {
	    preScripts: string[];
	    postScripts: string[];
	
	    static createFrom(source: any = {}) {
	        return new FolderScriptsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.preScripts = source["preScripts"];
	        this.postScripts = source["postScripts"];
	    }
	}
	export class HistoryEntry {
	    id: string;
	    source: string;
	    source_tool: string;
	    project_name: string;
	    request_name: string;
	    method: string;
	    url: string;
	    status_code: number;
	    duration: number;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.source = source["source"];
	        this.source_tool = source["source_tool"];
	        this.project_name = source["project_name"];
	        this.request_name = source["request_name"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.status_code = source["status_code"];
	        this.duration = source["duration"];
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistorySearchParams {
	    project: string;
	    name: string;
	    url: string;
	    method: string;
	    status: number;
	    source: string;
	    tool: string;
	    from: string;
	    to: string;
	    keyword: string;
	
	    static createFrom(source: any = {}) {
	        return new HistorySearchParams(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.project = source["project"];
	        this.name = source["name"];
	        this.url = source["url"];
	        this.method = source["method"];
	        this.status = source["status"];
	        this.source = source["source"];
	        this.tool = source["tool"];
	        this.from = source["from"];
	        this.to = source["to"];
	        this.keyword = source["keyword"];
	    }
	}
	
	
	export class Project {
	    id: string;
	    name: string;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProjectScript {
	    id: string;
	    project_id: string;
	    name: string;
	    description: string;
	    path: string;
	    content: string;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new ProjectScript(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.project_id = source["project_id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.path = source["path"];
	        this.content = source["content"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProjectScriptsResult {
	    preScripts: string[];
	    postScripts: string[];
	
	    static createFrom(source: any = {}) {
	        return new ProjectScriptsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.preScripts = source["preScripts"];
	        this.postScripts = source["postScripts"];
	    }
	}
	export class RequestHistory {
	    id: string;
	    source: string;
	    source_tool: string;
	    project_id: string;
	    project_name: string;
	    request_name: string;
	    request_path: string;
	    method: string;
	    url: string;
	    spec: HttpRequestSpec;
	    response?: CurlResponse;
	    // Go type: time
	    created_at: any;
	
	    static createFrom(source: any = {}) {
	        return new RequestHistory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.source = source["source"];
	        this.source_tool = source["source_tool"];
	        this.project_id = source["project_id"];
	        this.project_name = source["project_name"];
	        this.request_name = source["request_name"];
	        this.request_path = source["request_path"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.spec = this.convertValues(source["spec"], HttpRequestSpec);
	        this.response = this.convertValues(source["response"], CurlResponse);
	        this.created_at = this.convertValues(source["created_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	

}

export namespace project {
	
	export class ProjectGroupsState {
	    groups: string[];
	    assignments: Record<string, string>;
	    collapsedGroups?: string[];
	
	    static createFrom(source: any = {}) {
	        return new ProjectGroupsState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.groups = source["groups"];
	        this.assignments = source["assignments"];
	        this.collapsedGroups = source["collapsedGroups"];
	    }
	}
	export class ProjectTree {
	    id: string;
	    name: string;
	    type: string;
	    method?: string;
	    url?: string;
	    children?: ProjectTree[];
	    path?: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectTree(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.children = this.convertValues(source["children"], ProjectTree);
	        this.path = source["path"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}


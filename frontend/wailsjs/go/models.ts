export namespace config {
	
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
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.proxy = this.convertValues(source["proxy"], ProxyConfig);
	        this.ui = this.convertValues(source["ui"], UIConfig);
	        this.gitSync = this.convertValues(source["gitSync"], GitSyncConfig);
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
	    active_case_id?: string;
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
	        this.active_case_id = source["active_case_id"];
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
	    headers: Record<string, string>;
	    body: string;
	    duration: number;
	    error: string;
	    script_logs?: string[];
	    tests?: TestResult[];
	
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


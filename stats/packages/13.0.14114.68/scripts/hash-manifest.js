
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Microsoft Power BI</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge;" />
    <base href="/">
    <meta charset="utf-8">
    <meta name="description" content="">
    <meta name="format-detection" content="telephone=no" />
    <link rel="shortcut icon" href="/images/PowerBI_Favicon.ico" />

    <script>
        var viewLoadingStarted = Date.now();



        var skipCheckPowerBIAccessToken = true;
        var powerBIAccessToken = 'any';
        var reportId = 'any';
        var getExplorationUrl = '/public/';
        var getConceptualSchemaUrl = '/public/reports/conceptualschema';
        var queryDataUrl = '/public/reports/querydata';
        var resourceLoaderUrl = '/public/reports/resourcePackage/';
        var routingUrl = '/public/routing/cluster/';
        var resourceLoaderIncludePackageId = true;
        var isLoadReportMessagePending = false;
        var isReportControllerInitialized = false;
        var isAnonymousEmbed = true;
        var accessToken;
        var oDataFilter;
        var resolvedClusterUri = '';
        var resourceKey;
        var resolveClusterError;
        var modelsAndExplorationPromise;
        var modelsAndExplorationResponse;
        var frontLoadStatus;
        var frontLoadError;
        var conceptualSchemaPromise;
        var conceptualSchemaResponse;
        var loadingState = "#Loading#";
        var errorState = "#Error#";
        var isConceptualSchemaCached;
        var isModelsAndExplorationCached;
        var conceptualSchemaDuration;
        var clusterResolutionFrontLoadStartTime = null;
        var clusterResolutionFrontLoadEndTime = null;
        var modelsAndExplorationFrontLoadStartTime = null;
        var modelsAndExplorationFrontLoadEndTime = null;
        var conceptualSchemaFrontLoadStartTime = null;
        var conceptualSchemaFrontLoadEndTime = null;
        var reportThumbnailPromise;
        var reportThumbnailResponse;
        var reportThumbnailFrontLoadStartTime;
        var reportThumbnailFrontLoadEndTime;
        var reportThumbnailDuration;
        var reportThumbnailRequestId;
        var reportThumbnailResponseRequestId;
        var responseRequestId;
        var conceptualSchemaRequestId;
        var conceptualSchemaResponseRequestId;
        var modelsAndExplorationRequestId;
        var modernEmbed = '' === "true";
        var isOptimizePublishToWebEnabled = '' === "true";

        var reportThumbnailPrefix = "ReportThumbnail";
        var modelsAndExplorationPrefix = "ModelsAndExploration";
        var conceptualSchemaPrefix = "conceptualSchema";

        var reportThumbnailPrefix = "ReportThumbnail";
        var modelsAndExplorationPrefix = "ModelsAndExploration";
        var conceptualSchemaPrefix = "conceptualSchema";

        //register for messages from parent window
        window.addEventListener("message", receiveMessage, false);

        //handle message from parent window
        function receiveMessage(event) {
            if (event.data) {
                try {
                    var messageData = jsCommon.JsonExtensions.isJsonString(event.data) ? JSON.parse(event.data) : event.data;
                    if (messageData.action === 'setPage') {
                        if (!messageData.pageName) {
                            return;
                        }

                        var pageName = messageData.pageName;
                        if (isReportControllerInitialized) {
                            setPage(pageName);
                        }
                    }
                }
                catch (e) {
                    var embedReportLoadMessage = {
                        event: 'error',
                        error: 'Invalid message data:' + e.message,
                    };
                    window.parent.postMessage(JSON.stringify(embedReportLoadMessage), '*');
                    return;
                }
            }
        }

        function resolveCluster() {
            try {
                var activityId = telemetrySessionId;
                var requestId = 'a0cc7c14-fc22-49f5-9efe-374c7a162640';

                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    try {
                        if(xhr.readyState == XMLHttpRequest.DONE) {
                            clusterResolutionFrontLoadEndTime = Date.now();
                            var response = JSON.parse(xhr.responseText);
                            if(response.FixedClusterUri) {
                                resolvedClusterUri = response.FixedClusterUri;
                                if(allowPublishToWebPreLoadFlag) {
                                getModelsAndExplorationAndConceptualSchema();
                                }
                            }
                            else {
                                resolveClusterError = "FixedClusterUri is empty, activityid:" + activityId + "requestid:" + requestId;
                            }
                        }
                    }
                    catch(e) {
                        resolveClusterError = "Exception:"+e.message +", activityid:" + activityId + "requestid:" + requestId;
                    }
                }

                var apimClusterUri = getAPIMUrl(clusterUri);
                xhr.open("GET", apimClusterUri + routingUrl + tenantId);
                setGETRequestHeaders(xhr, telemetrySessionId, requestId, resourceKey);
                clusterResolutionFrontLoadStartTime = Date.now();
                xhr.send();
            }
            catch(e) {
                resolveClusterError = "Exception:"+e.message +", activityid:" + activityId + "requestid:" + requestId;
            }
        }

        function getModelsAndExploration() {
            try {
                var activityId = telemetrySessionId;
                var requestId = 'bdebe7e2-81b9-4adf-99f6-2bcdccfcba32';

                if(!resolvedClusterUri) {
                    return;
                }

                var resolvedAPIMCluster = getAPIMUrl(resolvedClusterUri);
                url = resolvedAPIMCluster + "/public/reports/" + resourceKey + "/modelsAndExploration?preferReadOnlySession=true";

                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    try{
                        var status = xhr.status;
                        if(xhr.readyState == XMLHttpRequest.DONE) {
                            modelsAndExplorationFrontLoadEndTime = Date.now();
                            var isSuccess = status >= 200 && status < 300 || status === 304;
                            frontLoadStatus = status;
                            if(isSuccess) {
                                var response = xhrBuildResponse(xhr, activityId, requestId);
                                modelsAndExplorationPromise.resolve(response);
                                var data = JSON.parse(response.responseText);
                                responseRequestId =  xhr.getResponseHeader('requestId');
                                isModelsAndExplorationCached = responseRequestId && responseRequestId !== requestId ? true: false;
                                modelsAndExplorationRequestId = responseRequestId ? responseRequestId : requestId;
                            }
                            else {
                                try {
                                    var data = JSON.parse(xhr.response);
                                    if (data && data.error) {
                                    modelsAndExplorationPromise.reject(xhrBuildResponse(xhr, activityId, requestId, true /*isError*/));
                                    }
                                }
                                catch (e) {
                                     modelsAndExplorationPromise.reject(buildExceptionResponse(activityId, requestId, e, modelsAndExplorationPrefix));
                                }
                            }
                        }
                    }
                    catch(e) {
                        console.error(e);
                        modelsAndExplorationPromise.reject(buildExceptionResponse(activityId, requestId, e, modelsAndExplorationPrefix));
                    }
                }

                xhr.open("GET", url);
                setGETRequestHeaders(xhr, telemetrySessionId, requestId, resourceKey);
                modelsAndExplorationFrontLoadStartTime = Date.now();
                xhr.send();
            }
            catch(e) {
                console.error(e);
                modelsAndExplorationPromise.reject(buildExceptionResponse(activityId, requestId, e, modelsAndExplorationPrefix));
            }
        }

        function getConceptualSchema() {
            try {
                conceptualSchemaFrontLoadStartTime = Date.now();
                conceptualSchemaResponse = loadingState;

                var activityId = telemetrySessionId;
                var requestId = '4ef48729-8ef9-4017-96ea-a33af3def187';

                var resolvedAPIMCluster = getAPIMUrl(resolvedClusterUri);
                url = resolvedAPIMCluster + "/public/reports/" + resourceKey + "/conceptualschema";

                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    try {
                        conceptualSchemaFrontLoadEndTime = Date.now();
                        var status = xhr.status;
                        if(xhr.readyState == XMLHttpRequest.DONE) {
                            var isSuccess = status >= 200 && status < 300 || status === 304;
                            if(isSuccess) {
                                var response = xhrBuildResponse(xhr, activityId, requestId);
                                conceptualSchemaPromise.resolve(response);
                                var data = JSON.parse(response.responseText);
                                conceptualSchemaDuration = conceptualSchemaFrontLoadEndTime - conceptualSchemaFrontLoadStartTime;
                                responseRequestId =  xhr.getResponseHeader('requestId');
                                isConceptualSchemaCached = responseRequestId && responseRequestId !== requestId ? true: false;
                                conceptualSchemaRequestId = requestId;
                                conceptualSchemaResponseRequestId = responseRequestId ? responseRequestId : requestId;
                                setConceptualSchema(data);
                            }
                            else {
                                setConceptualSchema(errorState);
                            }
                        }
                    }
                    catch(e) {
                        setConceptualSchema(errorState);
                    }
                }

                xhr.open("GET", url);
                setGETRequestHeaders(xhr, telemetrySessionId, requestId, resourceKey);
                xhr.send();
            }catch(e) {
                setConceptualSchema(errorState);
            }
        }

        function getReportThumbnail() {
            try {
                reportThumbnailFrontLoadStartTime = Date.now();

                var activityId = telemetrySessionId;
                var requestId = '9d37e2ae-1b5d-4431-a1dd-432634034a3d';

                var resolvedAPIMCluster = getAPIMUrl(resolvedClusterUri);
                url = resolvedAPIMCluster + "/public/reports/" + resourceKey + "/thumbnail";

                var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function() {
                    try {
                        reportThumbnailFrontLoadEndTime = Date.now();
                        var status = xhr.status;
                        if(xhr.readyState == XMLHttpRequest.DONE) {
                            var isSuccess = status >= 200 && status < 300 || status === 304;
                            if(isSuccess) {
                                var response = xhrBuildResponse(xhr, activityId, requestId);
                                reportThumbnailPromise.resolve(response);
                                var data = JSON.parse(response.responseText);
                                reportThumbnailDuration = reportThumbnailFrontLoadEndTime - reportThumbnailFrontLoadStartTime;
                                responseRequestId =  xhr.getResponseHeader('requestId');
                                reportThumbnailRequestId = requestId;
                                reportThumbnailResponseRequestId = responseRequestId ? responseRequestId : requestId;
                            } 
                            // This is when customer has changed the thumbnail to report from the UI but forgot to change the iframe url in the webside it is embedded in.
                            // on recieving 404 on getThumnail call, we want to load the report instead of rejecting the promise as customer expected.
                            else if(status == 404)
                                {
                                var response = xhrBuildResponse(xhr, activityId, requestId);
                                reportThumbnailPromise.resolve(response);
                                }                            
                            else  {
                                    if (reportThumbnailPromise) {
                                    try {
                                        reportThumbnailPromise.reject(xhrBuildResponse(xhr, activityId, requestId, true /*isError*/));
                                    }
                                    catch (e) {
                                        console.error(e);
                                        // Cannot parse an error out of the response
                                        reportThumbnailPromise.reject(buildExceptionResponse(activityId, requestId, e, reportThumbnailPrefix));
                                    }
                                }
                            }
                        }
                    }
                    catch(e) {
                        console.error(e);
                        if (reportThumbnailPromise) {
                            reportThumbnailPromise.reject(buildExceptionResponse(activityId, requestId, e, reportThumbnailPrefix));
                        }
                    }
                }

                xhr.open("GET", url);
                setGETRequestHeaders(xhr, telemetrySessionId, requestId, resourceKey);
                xhr.send();
            }catch(e) {
                    console.error(e);
                    if (reportThumbnailPromise) {
                        reportThumbnailPromise.reject(buildExceptionResponse(activityId, requestId, e, reportThumbnailPrefix));
                    }
            }
        }

        function setGETRequestHeaders(xhr, activityId, requestId, resourceKey) {
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('ActivityId', activityId);
            xhr.setRequestHeader('RequestId', requestId);
            xhr.setRequestHeader('X-PowerBI-ResourceKey', resourceKey);
        }

        function setPOSTRequestHeaders(xhr, activityId, requestId, resourceKey) {
            setGETRequestHeaders(xhr, activityId, requestId, resourceKey);
            xhr.setRequestHeader('Content-Type', 'application/json');
        }

        function setConceptualSchema(data) {
            // TODO - Waiting for New API to make the decision if data will be array or single schema
            conceptualSchemaResponse = data;
        }

        function getAPIMUrl(clusterUri) {
            var parser = document.createElement('a');
            parser.href = clusterUri;

            var protocol =  parser.protocol;
            var hostname =  parser.hostname;

            var hostNameTakens = hostname.split(".");
            hostNameTakens[0] = hostNameTakens[0].replace("-redirect", "");
            hostNameTakens[0] = hostNameTakens[0].replace("global-", "");
            hostNameTakens[0] += "-api";
            var apiHostName = hostNameTakens.join(".");
            return protocol + "//" + apiHostName;
        }

        function isResponseCached(responseRequestId, requestId) {
            if(responseRequestId && responseRequestId !== requestId) {
                return true;
            }
            return false;
        }

        function defer() {
            var res, rej;

            var promise = new Promise(function (resolve, reject) {
                res = resolve;
                rej = reject;
            });

            promise.resolve = function (result) {
                res(result);
            };

            promise.reject = function (error) {
                rej(error);
            };

            return promise;
        }

        function xhrBuildResponse(xhr, activityId, requestId, isError) {
            var response = {
                activityId: activityId,
                requestId: requestId,
                status: xhr.status,
                responseText: xhr.responseText
            };

            xhrResponse = xhr.response && JSON.parse(xhr.response);
            if (!isError)
                response["data"] = xhrResponse;
            else
                response["error"] = xhrResponse && xhrResponse.error;

            return response;
        }

        function buildExceptionResponse(activityId, requestId, exception, prefix) {
            return {
                activityId: activityId,
                requestId: requestId,
                status: unknownErrorCode,
                error: {
                    message: prefix + " Exception: " + exception.message,
                    code: "FrontLoadException",
                },
            }
        }

        function getModelsAndExplorationAndConceptualSchema() {
            if (isOptimizePublishToWebEnabled) {
                reportThumbnailPromise = defer();
                getReportThumbnail();
            } else {
                modelsAndExplorationPromise = defer();
                conceptualSchemaPromise = defer();
                getModelsAndExploration();
                getConceptualSchema();
           }
        }

        var baseUrl = window.location.protocol + '//' + window.location.host;
        var powerbi = {
            session : {
                userInfo: {
                    alternateEmail: '',
                }
            }
        };

        powerbi.telemetrySamplingRules = 'embed';
        powerbi.build = '13.0.14114.68';
        powerbi.buildDetails = '13.0.14114.68';
        powerbi.clientVersion = '2008.2.02476-train';
        powerbi.customVisualsUrl = 'https://visuals.azureedge.net/;https://visuals2.azureedge.net/;https://extendcustomvisual.blob.core.windows.net/';
        powerbi.visualCDNBlobContainerUrl = 'prod';
        powerbi.common = {};
        powerbi.common.cultureInfo = 'en-US';
        powerbi.common.formattingLocale = 'en-US';
        var useCDN = 'True';
        var clusterUri =  'https://api.powerbi.com';
        var cdnUrl = 'https://content.powerapps.com/resource/powerbiwfe';
        var previousTenantId = '';
        var telemetrySessionId =  '922e123f-58ee-4e97-976f-24f88879a0cf';
        var sessionSource = "Embed";
        var allowTelemetry = true;
        var appInsightsV2InstrKey = '00406067-1af3-44c5-a2c1-4a57dd50194c';
        var appInsightsV2EndpointUrl = '';
        var initialDashboardContainer = undefined;
        var appLoadError = undefined;
        var allowPublishToWebPreLoadFlag =  false;

        var reportQueryString = new RegExp('[\\?&]r=([^&#]*)').exec(window.location.href);
        if (reportQueryString) {
            try {
                var embedCode = decodeURIComponent(reportQueryString[1]);
                var encodedReport = JSON.parse(atob(embedCode));
                var tenantId = encodedReport.t;
                resourceKey = encodedReport.k;
                if (resolvedClusterUri == '') {
                    resolvedClusterUri = undefined;
                    resolveCluster();
                } else if(allowPublishToWebPreLoadFlag) {
                    getModelsAndExplorationAndConceptualSchema();
                }
            }
            catch(e) {
                resolveClusterError = "Exception: " + e.message + ", activityid: " + telemetrySessionId;
            }
        }
    </script>

    <link rel="stylesheet" href="https://content.powerapps.com/resource/powerbiwfe/styles/reportembed.bundle.min.e22fcf1c1f13a0047fdc.css" onerror=cdnFallback(event) />

</head>
<body>
    <meta property="og:locale" content="en_US" />
    <meta property="og:title" content="Power BI Report" />
    <meta property="og:type" content="article" />
    <meta property="og:description" content="Report powered by Power BI">
    <meta property="og:image" content="https://app.powerbi.com/https://content.powerapps.com/resource/powerbiwfe/images/PowerBI125x125.f3eedd0bae32356ba16f.png">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Power BI Report" />
    <meta name="twitter:description" content="Report powered by Power BI">
    <meta name="twitter:image:src" content="https://app.powerbi.com/https://content.powerapps.com/resource/powerbiwfe/images/PowerBI125x125.f3eedd0bae32356ba16f.png">
    <meta name="twitter:image" content="https://app.powerbi.com/https://content.powerapps.com/resource/powerbiwfe/images/PowerBI125x125.f3eedd0bae32356ba16f.png">

    <!-- perf: loading screen directly on page -->
    <div id="pbi-loading"><svg version = "1.1" class="pulsing-svg-item" xmlns="http://www.w3.org/2000/svg"xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 36 36"style ="enable-background:new 0 0 36 36;"xml:space="preserve"><g><path class="st1" d="M31.2,27.5h-0.7v-1.4h0.7c1.5,0,2.7-1.2,2.7-2.7V9.1c0-1.5-1.2-2.7-2.7-2.7H4.8c-1.5,0-2.7,1.2-2.7,2.7v14.2c0,1.5,1.2,2.7,2.7,2.7h0.7v1.4H4.8c-2.2,0-4.1-1.8-4.1-4.1V9.1c0-2.2,1.8-4.1,4.1-4.1h26.4c2.2,0,4.1,1.8,4.1,4.1v14.2C35.3,25.6,33.5,27.5,31.2,27.5" /><path class="st1" d="M9.1,30.9c-1,0-1.9-0.8-1.9-1.9l0-4.4c0-1,0.8-1.9,1.9-1.9h0c1,0,1.9,0.8,1.9,1.9l0,4.4C11,30.1,10.1,30.9,9.1,30.9L9.1,30.9z" /><path class="st1" d="M15,30.9c-1,0-1.9-0.8-1.9-1.9l0-11.2c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9l0,11.2C16.9,30.1,16.1,30.9,15,30.9" /><path class="st1" d="M26.9,30.9c-1,0-1.9-0.8-1.9-1.9l0-15.9c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9l0,15.9C28.8,30,28,30.9,26.9,30.9" /><path class="st1" d="M21,30.9c-1,0-1.9-0.8-1.9-1.9l0-8.3c0-1,0.8-1.9,1.9-1.9c1,0,1.9,0.8,1.9,1.9l0,8.3C22.9,30.1,22,30.9,21,30.9" /></g></svg></div>

    <div id='pbiAppPlaceHolder'>
        <ui-view></ui-view>
        <root></root>
    </div>

    <script> function cdnFallback(event) {var date = new Date(); var failedRequestUrl = 'unknown'; var maxAgeInSeconds = 8 * 60 * 60;if (event && event.currentTarget && event.currentTarget.src) {failedRequestUrl = event.currentTarget.src;}document.cookie = 'disablecdn=cdnRequestFailureTimestamp:' + date.toUTCString() + '-cdnRequestFailureUrl:' + failedRequestUrl + '; max-age=' + maxAgeInSeconds + '; secure';window.location.reload(true); }</script>
<script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['globalize.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/jquery.globalize/globalize.min.8e8ec43af69cf3d5d7aa.js" defer  onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['globalize.min.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['globalize.culture.en-US.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/jquery.globalize/globalize.culture.en-US.07ca294f77f622a072a5.js" defer  onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['globalize.culture.en-US.js'].end = Date.now();</script>    <script>

        powerbi.common.localizedStrings = '';
    </script>
<script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['hash-manifest.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="13.0.14114.68/scripts/hash-manifest.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['hash-manifest.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['reportembed.externals.bundle.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/reportembed.externals.bundle.min.ae20ac87203467db6bdd.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['reportembed.externals.bundle.min.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['powerbiportal.dependencies.bundle.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/powerbiportal.dependencies.bundle.min.7732a5aae41b8350017c.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['powerbiportal.dependencies.bundle.min.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['reportembed.common.bundle.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/reportembed.common.bundle.min.b5cef5cd7ee0acc5d08b.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['reportembed.common.bundle.min.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['powerbiportal.explore.bundle.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/powerbiportal.explore.bundle.min.eb3a58d14615ff0a5489.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['powerbiportal.explore.bundle.min.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['reportembed.bundle.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/reportembed.bundle.min.abacca1bb860cb3249f6.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['reportembed.bundle.min.js'].end = Date.now();</script><script type="text/javascript">this.parseTimeMarkers = this.parseTimeMarkers || {};this.parseTimeMarkers['reportEmbed.min.js'] = { nominalStart: Date.now(), start: Date.now()};</script><script type="text/javascript" src="https://content.powerapps.com/resource/powerbiwfe/scripts/reportEmbed.min.6fcf0051f389ee42646c.js" onerror=cdnFallback(event) ></script>
<script type="text/javascript">this.parseTimeMarkers['reportEmbed.min.js'].end = Date.now();</script>
</body>
</html>

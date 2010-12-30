/********************************
 * Taobao Uploader Script
 *
 * created by yubo 2009-03-18
 ********************************/

var TB = TB || {};
TB.Uploader = function() {
    var Y = YAHOO.util, Dom = Y.Dom, Event = Y.Event, Lang = YAHOO.lang;
    var debug = (YAHOO.env.ua.gecko && window.console) ? console.log : function(){}; // ������

    var defConfig = {
        swfUrl: 'uploader.swf',
        container: null,
        buttonSkin: '',
        forceTransparent: false,
        allowMultipleFiles: true, // ������ļ��ϴ�
        fileFilters: [{description: '�����ļ� (*.*)', extensions: '*.*'}],
        uploadForm: 'J_UploadForm', // ��������ϴ�form�����л�ȡaction, method
        uploadList: 'J_UploadList', // �ϴ��ļ����б��������tmplԼ��
        uploadBtn: 'J_UploadAll'
        /* ������Щ������Լ������uploadForm�����inputԪ���
         * �ô��ǽ������иı�ʱ�����»��Ƽ򵥣�����ͨ���¼���ʵ��
         * �����ǣ���Ҫ��html�ṹ����Լ���Ĺ���
        uploadScriptPath: 'uploader.php', // [ȡuploadForm��action]
        uploadMethod: 'POST', // [ȡuploadForm��method]
        fileSizeLimit: 2, // �ϴ������ļ��Ĵ�С���ƣ���λΪM [ȡuploadForm.fileSizeLimit]
        uploadTimeout�� 60, // �����ļ����ϴ�ʱ�䲻�ܳ���60s [ȡuploadForm.uploadTimeout]
        needValidate: true, // �Ƿ���ҪУ���ļ��ߴ�ʹ�С�� [ȡuploadForm.needValidate]
        batchPublish: false // �Ƿ��������� [ȡuploadForm.batchPublish]
        */
    };

    /**
     * TPS Uploader
     * ӵ�е������б�Ϊ��
     *  this.config
     *  this.uploadForm
     *  this.uploadList
     *  this.selectBtn - ѡ���ļ���ť
     *  this._uploader - YUI Uploader
     *  this.fileList - _uploader�ڲ����ļ��б�
     *  this.totalFilesSize
     *  this.totalFilesNum
     *  this.uploadedFilesNum - �Ѿ��ϴ����ļ��������ɹ��ĺ�ʧ�ܵģ�
     *  this.uploadFailedNum - �ϴ�ʧ�ܵ��ļ���
     *  this.needValidate - �Ƿ���ҪУ�� Ĭ��true
     *  this.batchPublish - �Ƿ��������� Ĭ��true
     */
    var Uploader = function(config) {
        this.config = Lang.merge(defConfig, config || {});
        init.call(this);
    };
    Lang.augmentProto(Uploader, Y.EventProvider);

    function init() {
        var cfg = this.config;

        // create YAHOO.widget.Uploader
        YAHOO.widget.Uploader.SWFURL = cfg.swfUrl;
        this._uploader = new YAHOO.widget.Uploader(cfg.container, cfg.buttonSkin, cfg.forceTransparent);

        // init uploadList and uploadForm etc.
        this.uploadList = Dom.get(cfg.uploadList);
        this.uploadForm = Dom.get(cfg.uploadForm);
        Event.on(this.uploadForm, 'submit', function(ev) {
            Event.preventDefault(ev);
            this.uploadAll();
        }, this, true);
        this.uploadBtn = Dom.get(cfg.uploadBtn);
        this.selectBtn = Dom.get(cfg.container);
        this.uploadTimeout = this.uploadForm['uploadTimeout'].value || 60; // Ĭ��60s

        // init form checkboxs
        var nvCheckbox = this.uploadForm['needValidate'];
        Event.on(nvCheckbox, 'click', function() {
            for(var fileId in this.fileList) {
                this.validateItem(fileId);
            }
            this.fireEvent('fileListChange');
        }, this, true);

        var bpCheckbox = this.uploadForm['batchPublish'];
        Event.on(bpCheckbox, 'click', function() {
            this.batchPublish = bpCheckbox.checked;
        }, this, true);
        this.batchPublish = bpCheckbox.checked; // init

        // init events
        this._uploader.addListener('contentReady', function() {
            this.setAllowMultipleFiles(cfg.allowMultipleFiles);
            this.setFileFilters(cfg.fileFilters);
        });
        this._uploader.addListener('fileSelect', function(ev) {
            this.fileList = ev.fileList;
            this.onFileSelect(ev.fileList);
        }, this, true);
        this._uploader.addListener('uploadStart', function(ev) {
            this.onUploadStart(ev.id);
        }, this, true);
        this._uploader.addListener('uploadProgress', function(ev) {
            this.onUploadProgress(ev.id, ev.bytesLoaded, ev.bytesTotal);
        }, this, true);
        this._uploader.addListener('uploadCompleteData', function(ev) {
            this.onUploadComplete(ev.id, ev.data);
        }, this, true);
        this._uploader.addListener('uploadError', function(ev) {
            this.onUploadError(ev.id, ev.status);
        }, this, true);
        this._uploader.addListener('uploadCancel', function(ev) {
            this.onUploadCancel(ev.id);
        }, this, true);

        // add events
        this.createEvent('fileListChange');
        this.createEvent('uploadCompleteAll');
    }

    Lang.augmentObject(Uploader.prototype, {
        /**
         * �ϴ������ļ�
         */
        uploadAll: function() {
            // reset
            this.uploadedFilesNum = 0;
            this.uploadFailedNum = 0;

            // �Ƴ�δͨ���ͻ���У����ļ�
            var badItems = Dom.getElementsByClassName('warning', 'li', this.uploadList);
            for(var i = 0, len = badItems.length; i < len; ++i) {
                this.removeFile(badItems[i].id);
            }

            // ���ļ���С�ڲ�����ʱ�����YUI Uploader�ᱨ���bug
            this._uploader.setSimUploadLimit(this.totalFilesNum < 5 ? this.totalFilesNum : 5);

            // ��ȡuploadScriptPath
            var uploadScriptPath = this.uploadForm.action;
            var method = this.uploadForm.getAttribute('method') || 'POST';
            this.batchPublishId = this.batchPublish ? new Date().getTime() : 0;
            var vars = {
              'needValidate': this.needValidate,
              'batchPublishId': this.batchPublishId // Ϊ0��ʾ����Ҫ��������
            };
            debug(Lang.dump(vars));
            
            this._uploader.uploadAll(uploadScriptPath, method, vars);

            // ����ɾ���ȿɲ�����ť
            Dom.addClass(this.uploadForm, 'ui-disabled');
            if(this.uploadForm['needValidate']) {
                this.uploadForm['needValidate'].setAttribute('disabled', 'disabled');
            }
            if(this.uploadForm['batchPublish']) {
                this.uploadForm['batchPublish'].setAttribute('disabled', 'disabled');
            }
            this._uploader.disable();
            this.setUploadBtnStatus(false);
        },

        /**
         * ѡ���ļ�ʱ�������¼�
         */
        onFileSelect: function(fileList) {
            var tmplItem = Dom.get('tmpl-upload-item');
            debug('onFileSelect: fileList = ' + Lang.dump(fileList));

            var len = this._getTotalFilesNum();
            for (var i = 0; i < len; ++i) { // ��֤��˳�����У�����ѡȡ����ļ�ʱ��˳�����ҵ�
                var file = fileList['file' + i];
                if (Dom.get(file.id)) continue; // �Ѿ���ӹ�

                var html = tmplItem.innerHTML.replace('%filename', file.name);
                html = html.replace('%filesize', this._getFileSize(file.size));

                var newItem = tmplItem.cloneNode(false);
                newItem.id = file.id;
                newItem.innerHTML = html;

                // ���ɾ����ť���¼�
                (function(uploader, newItem) {
                    var removeBtn = Dom.getElementsByClassName('J_RemoveFile', 'a', newItem)[0];
                    Event.on(removeBtn, 'click', function(ev) {
                        Event.preventDefault(ev);
                        uploader.removeFile(Dom.getAncestorByTagName(this, 'li').id);
                    });
                })(this, newItem);

                // ��Ӳ�У��
                this.uploadList.appendChild(newItem);
                this.validateItem(file.id);
            }
            this.onFileListChange();
        },

        /**
         * �ļ��б����ı�ʱ����
         */
        onFileListChange: function() {
            this.totalFilesSize = this._getTotalFilesSize();
            this.totalFilesNum = this._getTotalFilesNum();
            this.fireEvent('fileListChange');
        },

        /**
         * �ļ���ʼ�ϴ�ʱ�������¼�
         */
        onUploadStart: function(fileId) {
            debug('upload started');
            Dom.setAttribute(Dom.get(fileId), 'class', 'processing');

            // ����timeout��ʱ��
            Lang.later(this.uploadTimeout * 1000, this, function() {
               if(this.isOnUploading(fileId)) {
                   this._uploader.cancel(fileId);
                   this.onUploadCancel(fileId);
               }
            });
        },

        /**
         * �ļ��ϴ������д������¼�
         */
        onUploadProgress: function(fileId, bytesLoaded, bytesTotal) {
            debug('on processing');
            var el = Dom.get(fileId);
            
            var percent = bytesLoaded / bytesTotal;
            var x = -795 + Math.round(340 * percent); /* -795 ��css�еĳ�ʼֵ����һ��  */
            Dom.setStyle(el, 'background-position', x + 'px 0');
        },

        /**
         * �ļ��ϴ����ʱ�������¼�
         */
        onUploadComplete: function(fileId, responseData) {
            debug('upload complete. responseData is ' + responseData);
            var el = Dom.get(fileId);

            // ȥ��������
            Dom.removeClass(el, 'processing');
            Dom.setStyle(el, 'background-position', '');

            if(!Lang.JSON.isValid(responseData)) {
                this.showResponse(fileId, {result: '0', msg: '���������ص���Ϣ������Ч��JSON��ʽ��\n\n' + responseData});
            } else {
                this.showResponse(fileId, Lang.JSON.parse(responseData));
            }
            this.checkUploadAll();
        },

        /**
         * �ļ��ϴ�ʱ�����˴���
         * ��ע����򵥵Ĳ����ǣ���uploader.php�ĸ���������404����
         */
        onUploadError: function(fileId, status) {
            debug('error occurs. status message: ' + status);
            this.showResponse(fileId, {result: '0', msg: status});
            this.checkUploadAll();
        },

        /**
         * �ļ��ϴ������б�ȡ��
         */
        onUploadCancel: function(fileId) {
            this.onUploadError(fileId, '�ϴ�ʱ�䳬ʱ�����ܳ��� ' + this.uploadTimeout + 's');
        },

        /**
         * ����ļ��Ƿ��Ѿ�ȫ���ϴ�
         */
        checkUploadAll: function() {
            this.uploadedFilesNum++;
            if (this.uploadedFilesNum == this.totalFilesNum) {
                if(!this.batchPublish) { // ������������ֱ����ʾ���
                    this.fireEvent('uploadCompleteAll');
                } else {
                   this.sendPublishRequest();
                }
            }
        },

        /**
         * ����������������
         */
        sendPublishRequest: function() {
            // ����һ��ʱ�����е����ļ��϶����Ѿ������ˣ�������ʱ�ȸ�����������Ĵ���
            // ����ֻҪ����Ƿ񶼴��ڡ��ȴ�������״̬��������Ӧ����
            var isAllOk = Dom.getElementsByClassName('wait-to-publish', 'li', this.uploadList).length == this.totalFilesNum;
            debug('sendPublishRequest: isAllOk = ' + isAllOk);
            if(isAllOk) {
                // ����������������
                var postData = 'batchPublishId=' + this.batchPublishId + '&fileServeIds=';
                var listItems = Dom.getChildren(this.uploadList);
                for(var i = 1, len = listItems.length; i < len; ++i) { // ��1��ʼ���ų�tmplItem
                    postData += listItems[i].getAttribute('serveId');
                    if(i != len - 1) {
                        postData += ',';
                    }
                }
                debug('postData' + postData); // "batchPublishId=456764575&fileServeIds=3543646,4576586,458658"

                var callback = {
                    success: function(o) {
                        var thisObj = o.argument;
                        debug('o.responseText: ' + o.responseText);
                        var results = Lang.JSON.parse(o.responseText);

                        if (results['result'] == '4') { // 4 ��ʾ���������г�����
                            showPublishErrors(thisObj, results['msg']);
                        } else {
                            // ����uploadList
                            for (var serveId in results) { // ��ʾurl
                                var fileItem = thisObj.getFileItemByServeId(serveId);
                                thisObj.showResponse(fileItem, {'result': '1', 'msg': results[serveId]});
                            }
                        }

                        // ���½���
                        thisObj.fireEvent('uploadCompleteAll');

                    },
                    /**
                     * ʧ��ʱ�Ĵ����¼�������404����
                     */
                    failure: function(o) {
                        debug('o.responseText: ' + o.responseText);
                        showPublishErrors(o.argument, '����ʱ��������');
                        this.fireEvent('uploadCompleteAll');

                    },
                    argument: this // ����ǰthis����ȥ
                };

                debug(this.uploadForm['publishUrl'].value);
                Y.Connect.asyncRequest('POST', this.uploadForm['publishUrl'].value, callback, postData);
                
            } else { // ˵����У��ȴ���ֱ����ʾ����������
                this.fireEvent('uploadCompleteAll');
            }

            /**
             * ��ʾ��������������Ĵ���
             */
            function showPublishErrors(thisObj, msg) {
                // ��ʾ������ʾ
                var listItems = Dom.getChildren(thisObj.uploadList);
                for (var i = 1, len = listItems.length; i < len; ++i) {
                    thisObj.showResponse(listItems[i], {'result': '4', 'msg': msg});
                }
                thisObj.uploadFailedNum = thisObj.totalFilesNum; // һ��ٴ��߼�
            }
        },

        /**
         * �ͻ���У��
         */
        validateItem: function(fileId) {
            var checkbox = this.uploadForm['needValidate'];
            this.needValidate = checkbox ? checkbox.checked : true; // Ĭ���Ǽ���
            if (this.needValidate) {
                // �ͻ��˵ļ�У��
                var fileSizeLimit = ((this.uploadForm['fileSizeLimit'] || 0).value) || 2; // Ĭ��2M

                if (this.fileList[fileId].size > 1024 * 1024 * fileSizeLimit) {
                    this.showResponse(fileId, {result: '2', msg: '�ļ���С���ܳ���' + fileSizeLimit + 'M������б����Ƴ���'});
                }
            } else {
                this.showResponse(fileId, {result: '', msg: ''});
                Dom.setAttribute(Dom.get(fileId), 'class', 'default');
            }
        },

        /**
         * �����ϴ���ť��״̬
         * @param enable �Ƿ��ڿ���״̬
         */
        setUploadBtnStatus: function(enable) {
            if (enable) {
                Dom.removeClass(this.uploadBtn, 'disabled');
                this.uploadBtn.removeAttribute('disabled');
            } else {
                Dom.addClass(this.uploadBtn, 'disabled');
                this.uploadBtn.setAttribute('disabled', 'disabled');
            }
        },

        /**
         * ��ʾ��Ӧ��Ϣ
         * result:
         *  0 - �ļ��ϴ�ʧ��
         *  1 - �ļ��ϴ��ɹ�
         *  2 - ���ػ������У��ʧ��
         *  3 - �ϴ��ѳɹ����ȴ�������
         *  4 - ����ʧ��
         */
        showResponse: function(fileId, response) {
            var fileItem = Dom.get(fileId);
            if(!fileItem) {
                debug('fileId: ' + fileId + ' ������');
                return;
            }
            debug('response: ' + Lang.dump(response));

            var resultCode = response['result'];
            var resultMsg = response['msg'];
            var msgClass = '';
            switch(resultCode) {
                case '0': msgClass = 'error'; break;
                case '1': msgClass = 'ok'; break;
                case '2': msgClass = 'warning'; break;
                case '3': msgClass = 'wait-to-publish'; break;
                case '4': msgClass = 'error'; break; // �Ӿ��Ϻ�errorһ��
            }
            Dom.setAttribute(fileItem, 'class', msgClass);

            var msgEl = Dom.getElementsByClassName('msg', '*', fileId)[0];
            if(msgEl) {
                if(resultMsg.indexOf('http') == 0) { // ���ص���URL
                    resultMsg = '<input type="text" class="url" onclick="javascript: this.select()" value="' + resultMsg + '" />';
                }
                msgEl.innerHTML = resultMsg;
            }

            if(resultCode == 2 || resultCode == 0) {
                this.uploadFailedNum++;
            };

            if(this.batchPublish && typeof response['fileServeId'] != 'undefined') {
                fileItem.setAttribute('serveId', response['fileServeId']); // �������˶�Ӧ��fileServeId
            }
        },

        /**
         * �Ƴ��ļ�
         */
        removeFile: function(fileId) {
            this._uploader.removeFile(fileId);
            delete this.fileList[fileId];
            this.uploadList.removeChild(Dom.get(fileId));
           
            this.onFileListChange();
        },

        /**
         * ״̬����
         */
        reset: function() {
            // reset fileList
            for(var fileId in this.fileList) {
                this.uploadList.removeChild(Dom.get(fileId));
            }
            this.fileList = null;
            this.totalFilesNum = 0;
            this.totalFilesSize = 0;
            this.fireEvent('fileListChange');

            // ����ɾ���ȿɲ�����ť
            Dom.removeClass(this.uploadForm, 'ui-disabled');
            if(this.uploadForm['needValidate']) {
                this.uploadForm['needValidate'].removeAttribute('disabled');
            }
            if(this.uploadForm['batchPublish']) {
                this.uploadForm['batchPublish'].removeAttribute('disabled');
            }

            // ie����Ҫ��һ�䣬�����������һ��ᵼ�³���
            if(YAHOO.env.ua.ie) {
                this._uploader.clearFileList();
                this._uploader.enable();
            }
        },

        /**
         * ���ĳ���ļ��Ƿ����ϴ�
         * @param fileId
         */
        isOnUploading: function(fileId) {
            return Dom.hasClass(fileId, 'processing');
        },

        /**
         * ����serveId�ҵ���Ӧ��list item
         * @param serveId
         */
        getFileItemByServeId: function(serveId) {
            var listItems = Dom.getChildren(this.uploadList);
            for(var i = 1, len = listItems.length; i < len; ++i) { // ����tmplItem
                if(listItems[i].getAttribute('serveId') == serveId) {
                    return listItems[i];
                }
            }
            return null;
        },

        /**
         * ��ȡ�Ѻ���ʾ���ļ��ߴ�
         */
        _getFileSize: function(size) {
            if (size < 1024) return size + ' B';

            size = size / 1024;
            if (size < 1024) {
                return size.toFixed(1) + ' KB';
            }

            return (size / 1024).toFixed(1) + ' MB';
        },

        /**
         * ��ȡ�Ѻ���ʾ���ļ���С
         */
        _getTotalFilesSize: function() {
            var totalSize = 0;
            for(var fileId in this.fileList) {
                totalSize += this.fileList[fileId].size;
            }
            return this._getFileSize(totalSize);
        },

        /**
         * ��ȡ�ļ���Ŀ
         */
        _getTotalFilesNum: function() {
            var num = 0;
            for(var fileId in this.fileList) {
                if(this.fileList[fileId]) {
                    num++;
                }
            }
            return num;
        }
    });

    return Uploader;
}();


YAHOO.util.Event.onDOMReady(function() {
    var Y = YAHOO.util, Dom = Y.Dom, Event = Y.Event;

    var uploader = new TB.Uploader({
        swfUrl: TB.Uploader.assetsConfig.swfUrl,
        container: 'J_UploadFlashBox',
        buttonSkin: TB.Uploader.assetsConfig.buttonSkin,
        allowMultipleFiles: true,
        fileFilters: [
            //{description: '�����ļ� (*.*)', extensions: '*.*'},
            {description: 'ͼƬ��Flash�ļ� (*.JPG;*.PNG;*.GIF;*.SWF)', extensions: '*.jpg;*.png;*.gif;*.swf'}
        ]
    });

    // �ļ��б����ı�ʱ���¼�
    var totalFilesSizeEl = Dom.get('J_TotalFilesSize');
    var totalFilesNumEl = Dom.get('J_TotalFilesNum');
    uploader.subscribe('fileListChange', function() {
        // 1. ����ͳ����Ϣ
        totalFilesSizeEl.innerHTML = this.totalFilesSize || '0 B';
        totalFilesNumEl.innerHTML = this.totalFilesNum || 0;

        // 2. �����ϴ���ť��״̬
        // ֱ�Ӹ���list��״̬���жϣ���³����ֻȡdefault״̬��li������Ҫ����tmplItem
        var isOk = Dom.getElementsByClassName('default', 'li', this.uploadList).length - 1 > 0;
        this.setUploadBtnStatus(isOk);
    });

    // �ļ�ȫ���ϴ����ʱ���¼�
    var uploadControls = Dom.getElementsByClassName('upload-controls', 'div', 'J_UploadForm')[0];
    var uploadResult = Dom.getElementsByClassName('upload-result', 'div', 'J_UploadForm')[0];
    uploader.subscribe('uploadCompleteAll', function() {
        // ��������ļ���ť
        Dom.setStyle(this.selectBtn.parentNode, 'display', 'none');

        // ���ؿ��Ʊ�Ԫ��
        Dom.addClass(uploadControls, 'hidden');

        // ��ʾ�ܵĳɹ��������Ϣ
        Dom.removeClass(uploadResult, 'hidden');
        if(this.uploadFailedNum) {
            Dom.get('J_UploadFailedNum').innerHTML = this.uploadFailedNum;
            Dom.addClass(uploadResult, 'error-result');
        } else {
            Dom.addClass(uploadResult, 'ok-result');
        }
    });

    // reset��ť
    Dom.getElementsByClassName('J_ResetUpload', 'a', uploadResult, function(each) {
        Event.on(each, 'click', function(ev) {
            Event.preventDefault(ev);

            // reset uploader
            uploader.reset();

            // ��ʾ����ļ���ť
            Dom.setStyle(uploader.selectBtn.parentNode, 'display', '');

            // ��ʾ���Ʊ�Ԫ��
            Dom.removeClass(uploadControls, 'hidden');

            // �����ܵĳɹ��������Ϣ
            Dom.removeClass(uploadResult, 'ok-result');
            Dom.removeClass(uploadResult, 'error-result');
            Dom.addClass(uploadResult, 'hidden');
        });
    });

});

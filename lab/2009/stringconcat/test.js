
// ��ʽA��ֱ�Ӳ��ö���д��
var a = '\
&lt;div class="kissy-toolbar-button" title="{TITLE}"&gt;\
    &lt;div class="kissy-toolbar-button-outer-box"&gt;\
        &lt;div class="kissy-toolbar-button-inner-box"&gt;\
            &lt;span class="kissy-toolbar-{NAME}"&gt;{TEXT}&lt;/span&gt;\
        &lt;/div&gt;\
    &lt;/div&gt;\
&lt;/div&gt;';

// ��ʽB����+��
var b = '&lt;div class="kissy-toolbar-button" title="{TITLE}"&gt;' +
            '&lt;div class="kissy-toolbar-button-outer-box"&gt;' +
                '&lt;div class="kissy-toolbar-button-inner-box"&gt;' +
                    '&lt;span class="kissy-toolbar-{NAME}"&gt;{TEXT}&lt;/span&gt;' +
                '&lt;/div&gt;' +
            '&lt;/div&gt;' +
        '&lt;/div&gt;';

// ��ʽC��������join
var c = ['&lt;div class="kissy-toolbar-button" title="{TITLE}"&gt;',
             '&lt;div class="kissy-toolbar-button-outer-box"&gt;',
                 '&lt;div class="kissy-toolbar-button-inner-box"&gt;',
                     '&lt;span class="kissy-toolbar-{NAME}"&gt;{TEXT}&lt;/span&gt;',
                 '&lt;/div&gt;',
             '&lt;/div&gt;',
         '&lt;/div&gt;'].join('');

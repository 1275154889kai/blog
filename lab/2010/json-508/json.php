<?php
header('Content-type: text/javascript');
header("Pragma: no-cache");
header('Cache-Control: no-cache,must-revalidate');
header("Expires: 0"); // set expiration time

$callback = $_GET["callback"];
$timeout = rand(0, 2); //for test

$data = '{ status: 200, result: {  } }'; // result ���Ǿ���ҵ������
if ($timeout) {
    $data = '{ status: 508 }'; // ��ʱʱ������ 508
}

if ($callback) { // jsonp
print <<<END
if(typeof $callback === 'function') {
    $callback($data);
}
END;
} else { // û�� callback
    echo $data;
}
?>
<?php

// Verify access via Tripwire signon
if (!session_id()) session_start();

if(!isset($_SESSION['userID'])) {
	http_response_code(403);
	exit();
}

header('Content-Type: application/json');

$fetch_data = array(
	'invasions' => array('url' => 'https://kybernaut.space/invasions.json', 'cache_file' => 'invasions.json', 'cache_for' => 3600)
)[$_REQUEST['key']];

if(!isset($fetch_data)) { 
	http_response_code(400);
	die(json_encode(array(reason => 'Unknown cache key')));
}

// Fetch into cache if not set
$cache_file = dirname(dirname(__FILE__)) . '/cache/' . $fetch_data['cache_file'];
if (!file_exists($cache_file) || (time() - filemtime($cache_file) >= $fetch_data['cache_for'])){
	file_put_contents($cache_file, fopen( $fetch_data['url'], 'r'));
}

readfile($cache_file);
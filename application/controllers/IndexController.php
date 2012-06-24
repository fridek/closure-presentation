<?php

class IndexController extends Zend_Controller_Action
{

    public function init()
    {

    }

    public function indexAction()
    {
        // action body
    }

    public function nojsAction()
    {
        $model = new Application_Model_DbTable_Test();
        $this->view->data = $model->getRows();
    }

    public function jquerypaginationAction()
    {

    }

    public function closurepaginationAction()
    {

    }

    public function closurecompilationAction()
    {

    }

    public function templatesAction()
    {

    }

    public function paginationhtmlAction()
    {
        $model = new Application_Model_DbTable_Test();
        $this->view->data = $model->getRows();
    }

    public function paginationjsonAction()
    {
        $model = new Application_Model_DbTable_Test();
        $dbdata = $model->getRows();

        $jsondata = Array();

        foreach($dbdata as $row) {
            $jsondata[] = Array(
                "name" => $row->name,
                "address" => $row->address,
                "www" => $row->www,
                "email" => $row->email,
                "leg_count" => $row->leg_count
            );
        }
        $this->getResponse()
            ->setHeader('Content-Type', 'text/html')
            ->setBody(json_encode($jsondata))
            ->sendResponse();
        exit;
    }



    public function addrandomdataAction() {
        $count = $this->getRequest()->getParam('count', 100);

        $model = new Application_Model_DbTable_Test();
        while($count--) {
            $model->addRandomRecord();
        }
    }
}




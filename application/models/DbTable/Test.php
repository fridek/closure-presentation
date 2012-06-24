<?php

class Application_Model_DbTable_Test extends Zend_Db_Table_Abstract
{
    private function getRandomName_() {
        $arr = str_split('qwertyuiopasdfghjklzxcvbnm');
        shuffle($arr);
        $arr = array_slice($arr, 0, rand(6,12));
        $str = implode('', $arr);
        return $str;
    }


    protected $_name = 'test';

    public function addRandomRecord() {
        $data = array(
             'name'         => ucwords($this->getRandomName_() . ' ' . $this->getRandomName_()),
             'address'      => ucwords($this->getRandomName_() . ', ' . $this->getRandomName_()) . ' ' . rand(1,128),
             'www'          => 'http://www.' . $this->getRandomName_() . '.com/',
             'email'        => $this->getRandomName_() . '@' . $this->getRandomName_() . '.com',
             'leg_count'    => rand(1,12)
        );
        $this->insert($data);
    }

    public function getRows($count = 50) {
        $select = $this->select()
            ->order(new Zend_Db_Expr('0*id+RAND()'))
        ->limit(250);
        return $this->fetchAll($select);
    }
}


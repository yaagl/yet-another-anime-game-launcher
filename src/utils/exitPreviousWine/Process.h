#ifndef EXITUSELESSPROCESS_PROCESS_H
#define EXITUSELESSPROCESS_PROCESS_H

#include "bits/stdc++.h"
#include "main.h"

using namespace std;

class Process {
public:
    int PID;
    string TT;
    string STAT;
    string TIME;
    string COMMAND;

    void init(vector<string> data) {
        this->PID = stoi(data.at(0));
        this->TT = data.at(1);
        this->STAT = data.at(2);
        this->TIME = data.at(3);
        // 后面的都可能是 COMMAND 的一部分，所有全部加上
        for (int i = 4; i < data.size(); i++) {
            this->COMMAND += data.at(i);
            if (i != data.size() - 1) {
                this->COMMAND += ' ';
            }
        }
    }
};


void getAllProcess(vector<Process>& allProcess) {
    // 获取运行结果
    string allProcessString;
    const char *command = "ps ax";
    systemCmd(command, allProcessString);
    // 字符串处理
    vector<string> allProcessVector;
    stringSplit(allProcessString, '\n', allProcessVector);
    for (int i = 1; i < allProcessVector.size(); i++) {
        string processString = allProcessVector.at(i);
        vector<string> processVector;
        stringSplit(processString, ' ', processVector);
        // 遍历获得的 processVector，去除其中的空元素，负值到最终的 loadedProcessVector 中
        vector<string> loadedProcessVector;
        for (const auto & j : processVector) {
            if (!j.empty()) {
                loadedProcessVector.push_back(j);
            }
        }
        // 创建 Process 对象
        Process process;
        process.init(loadedProcessVector);
        allProcess.push_back(process);
    }
}

#endif //EXITUSELESSPROCESS_PROCESS_H

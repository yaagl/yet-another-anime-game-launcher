#include "bits/stdc++.h"
#include "Process.h"

using namespace std;

int main() {
    vector<string> targetNames = {
            "wine64-preloader",
            "Yaagl"
    };
    cout << "Target Names: " << endl;
    for (auto & targetName : targetNames) {
        cout << '\t' << targetName << endl;
    }
    vector<Process> allProcess;
    getAllProcess(allProcess);
    for (auto & proc : allProcess) {
        // 判断是否满足所有的名字
        bool flag = true;
        for (const auto & targetName : targetNames) {
            if (!stringExist(proc.COMMAND, targetName)) {
                flag = false;
            }
        }
        if (flag) {
            // 杀掉
            printf("PID: %i | Command: %s\n", proc.PID, proc.COMMAND.c_str());
            ostringstream oss;
            oss << "kill -9 " << proc.PID;
            cout << oss.str() << endl;
            string result;
            systemCmd(oss.str().c_str(), result);
        }
    }
}

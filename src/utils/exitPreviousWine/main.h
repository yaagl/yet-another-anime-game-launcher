#ifndef EXITUSELESSPROCESS_MAIN_H
#define EXITUSELESSPROCESS_MAIN_H

#include "bits/stdc++.h"

using namespace std;

void systemCmd(const char *cmd, string& resultStr) {
    char result[1024000] = {0};
    char buffer[1024] = {0};
    FILE *fileStream = NULL;

    if ((fileStream = popen(cmd, "r")) == NULL) {
        printf("popen failed\n");
        return;
    }

    while (fgets(buffer, sizeof(buffer), fileStream)) {
        strcat(result, buffer);
    }

    pclose(fileStream);
    resultStr = string(result);
}

void stringSplit(const string& str, const char split, vector<string>& result) {
    istringstream iss(str);
    string token;
    while (getline(iss, token, split)) {
        result.push_back(token);
    }
}

int stringExist(const string& str, const string& target) {
    int targetSize = target.size();
    for (int i = 0; i < str.size() - targetSize; i++) {
        if (str.substr(i, targetSize) == target) {
            return 1;
        }
        if (i + targetSize > str.size()) {
            break;
        }
    }
    return 0;
}

#endif //EXITUSELESSPROCESS_MAIN_H

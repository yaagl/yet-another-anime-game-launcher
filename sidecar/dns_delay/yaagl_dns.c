#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <netdb.h>
#include <time.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define DYLD_INTERPOSE(_replacement,_replacee) \
   __attribute__((used)) static struct{ const void* replacement; const void* replacee; } _interpose_##_replacee \
            __attribute__ ((section ("__DATA,__interpose"))) = { (const void*)(unsigned long)&_replacement, (const void*)(unsigned long)&_replacee };

static time_t first_hit = 0;

int my_getaddrinfo(const char *hostname, const char *servname, const struct addrinfo *hints, struct addrinfo **res) {
    if (hostname) {
        if (strstr(hostname, "starrails.com") || strstr(hostname, "yuanshen.com") ||
            strstr(hostname, "zenlesszonezero.com") || strstr(hostname, "juequling.com")) {
            if (strstr(hostname, "globaldp") || strstr(hostname, "dispatch")) {
                time_t now = time(NULL);
                if (first_hit == 0) {
                    first_hit = now;
                    fprintf(stderr, "[yaagl_dns] Block timer started for %s\n", hostname);
                }
                double diff = difftime(now, first_hit);
                int duration = 4; // default 4s
                const char* env_dur = getenv("YAAGL_BLOCK_DURATION");
                if (env_dur) {
                    int d = atoi(env_dur);
                    if (d > 0) duration = d;
                }
                if (diff < duration) {
                    fprintf(stderr, "[yaagl_dns] [BLOCKED] %s (%.0fs / %ds) -> Returning EAI_NONAME\n", hostname, diff, duration);
                    return EAI_NONAME;
                } else {
                    fprintf(stderr, "[yaagl_dns] [ALLOWED] %s (%.0fs elapsed) -> Pass through to real DNS\n", hostname, diff);
                }
            }
        }
    }
    return getaddrinfo(hostname, servname, hints, res);
}

DYLD_INTERPOSE(my_getaddrinfo, getaddrinfo);

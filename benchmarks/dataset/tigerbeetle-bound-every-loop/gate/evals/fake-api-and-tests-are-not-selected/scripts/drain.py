import queue

pending = queue.Queue()

while True:
    print(pending.get())

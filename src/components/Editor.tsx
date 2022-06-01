import React, { useEffect, useRef } from "react";
import Codemirror, { EditorFromTextArea } from "codemirror";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import ACTIONS from "../actions";

export default function Editor({
  socketRef,
  roomId,
  onCodeChange,
}: {
  socketRef: Socket<DefaultEventsMap, DefaultEventsMap>;
  roomId: string;
  onCodeChange: any;
}) {
  const EditorRef = useRef<EditorFromTextArea>();
  useEffect(() => {
    const init = () => {
      const editorId = document.getElementById(
        "realtimeEditor"
      ) as HTMLTextAreaElement;

      EditorRef.current = Codemirror.fromTextArea(editorId, {
        mode: { name: "javascript", json: true },
        theme: "dracula",
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
      });
    };

    if (!EditorRef.current) init();
    else {
      EditorRef.current?.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();    
        onCodeChange(EditorRef.current);
        if (origin !== "setValue" && socketRef) {
          socketRef.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    }
  }, [socketRef, roomId, onCodeChange]);

  useEffect(() => {
    if (socketRef) {
      socketRef.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          EditorRef.current?.setValue(code);
        }
      });

      return () => {
        socketRef.off(ACTIONS.CODE_CHANGE);
      };
    }
  }, [socketRef]);

  return <textarea id="realtimeEditor"></textarea>;
}
